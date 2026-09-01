import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
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
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        // Check if user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        // If new user signing in via Google, auto-create their account
        if (!dbUser) {
          const year = new Date().getFullYear();
          const count = await prisma.user.count();
          const accountId = `DMO-${year}-${String(count + 1).padStart(5, '0')}`;
          const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);

          dbUser = await prisma.user.create({
            data: {
              name: user.name || email.split('@')[0],
              email,
              password: dummyPassword,
              role: 'OWNER',
              accountId,
              emailVerified: true,
              active: true,
            },
          });

          // Create initial default portfolio for Google signups
          await prisma.portfolio.create({
            data: {
              name: `${dbUser.name}'s Portfolio`,
              type: 'RESIDENTIAL',
              description: 'Default portfolio for properties',
              ownerId: dbUser.id,
              displayId: `PF-${String(count + 1).padStart(4, '0')}`,
            },
          }).catch(() => {});
        }

        if (!dbUser.active) {
          return false;
        }

        // Attach DB user id and role to user object so jwt callback gets it
        user.id = dbUser.id;
        user.role = dbUser.role;
      }
      return true;
    },

    // Runs in the Node runtime on every `auth()` read (pages + API routes),
    // but NOT in the Edge proxy (which uses authConfig's lighter jwt callback).
    // This is where we enforce live deactivation on already-issued sessions.
    async jwt({ token, user }) {
      // Sign-in: persist role and user ID onto the fresh token.
      if (user) {
        token.role = user.role;
        token.sub = user.id;
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const identifier = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        const normalised = identifier.toLowerCase();
        const cleanDigits = identifier.replace(/\D/g, '');
        const formattedPhone = identifier.startsWith('+') ? identifier : `+${cleanDigits}`;

        // Look up by email OR phone number
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalised },
              ...(cleanDigits.length >= 8 ? [
                { phone: identifier },
                { phone: formattedPhone },
                { phone: cleanDigits },
              ] : []),
            ],
          },
        });
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
