import type { DefaultSession } from 'next-auth';
import type { Role } from '@prisma/client';

// Teach next-auth about our extra `role` field so it's typed everywhere:
// what `authorize` returns (User), what `auth()`/`useSession` expose (Session),
// and what's stored in the JWT.
declare module 'next-auth' {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

// Augment @auth/core/jwt directly: next-auth/jwt only re-exports it (no own
// JWT interface), so augmenting next-auth/jwt wouldn't merge.
declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role;
  }
}
