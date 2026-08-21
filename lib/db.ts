import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env (see Neon project Propflow).');
}

// Reusable SQL client for Neon serverless Postgres.
// Use the tagged-template form for safe parameterized queries:
//   const rows = await sql`select * from users where id = ${id}`;
export const sql = neon(process.env.DATABASE_URL);
