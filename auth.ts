import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from '@/auth.config';

// Thrown when a valid-credential user is deactivated. The `code` surfaces to
// the login form so it can show a specific message.
class DeactivatedError extends CredentialsSignin {
  code = 'deactivated';
}

// Full Auth.js (NextAuth v5) instance. Runs in the Node.js runtime only —
// the Credentials provider below uses Prisma + bcrypt, which are NOT Edge-safe.
// Edge route protection lives in proxy.ts and uses the lighter authConfig.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Runs in the Node runtime on every `auth()` read (pages + API routes),
    // but NOT in the Edge proxy (which uses authConfig's lighter jwt callback).
    // This is where we enforce live deactivation on already-issued sessions.
    async jwt({ token, user }) {
      // Sign-in: persist role onto the fresh token.
      if (user) {
        token.role = user.role;
        return token;
      }
      // Subsequent requests: re-check the user still exists and is active.
      // Returning null invalidates the session — Auth.js clears the cookie,
      // so a deactivated user is logged out on their very next request.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { active: true, role: true },
        });
        if (!dbUser || !dbUser.active) return null;
        token.role = dbUser.role; // keep role in sync if it changed
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Normalise before lookup — register stores emails lowercased.
        const normalisedEmail = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });
        if (!user) return null;

        // Stored passwords are bcrypt hashes — compare, never decrypt.
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Only reveal deactivation AFTER the password checks out, so wrong
        // passwords can't probe account status.
        if (!user.active) throw new DeactivatedError();

        // Becomes the session user. Never return the password hash.
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
