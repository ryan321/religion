/**
 * Drops the public schema and re-applies the drizzle migrations from scratch.
 * Run with: npm run db:reset
 *
 * Destructive — deletes all tables and data.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = neon(url);

  console.log("Dropping public schema...");
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;

  console.log("Applying migrations...");
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
