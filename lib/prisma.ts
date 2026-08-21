import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

// Prisma 7 connects through a driver adapter instead of a schema `url`.
// The Neon adapter reads the pooled connection string from DATABASE_URL.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

// Reuse a single client across hot reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
