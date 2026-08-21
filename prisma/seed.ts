// Seeds one Super Admin user.
// Run with: npx tsx prisma/seed.ts
// `dotenv/config` (already a dependency) loads .env BEFORE lib/prisma reads
// DATABASE_URL — keep it as the first import.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const NAME = 'Super Admin';
const EMAIL = 'admin@propflow.app';
const PASSWORD = 'Admin@123';

async function main() {
  const password = await bcrypt.hash(PASSWORD, 10);

  // NOTE: the Super Admin intentionally has NO accountId. Account IDs
  // (DMO-YYYY-NNNNN) identify property OWNERS only — the super admin manages
  // owners rather than owning property, so it never gets one.
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { name: NAME, password, role: 'SUPER_ADMIN' },
    create: {
      name: NAME,
      email: EMAIL,
      password,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`Seeded ${user.role} ${user.email} — password: ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
