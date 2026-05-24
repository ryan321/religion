/**
 * Manually grant a book purchase to a user (testing helper). Inserts a row
 * in `purchases` with stripe_session_id NULL so it's clear it wasn't a real
 * Stripe checkout.
 *
 * Usage:
 *   npx tsx scripts/grant-purchase.ts <user-email> <book-slug>
 *
 * Idempotent — does nothing if the user already has the book.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { users, books, purchases } from "../src/db/schema";

async function main() {
  const [, , email, slug] = process.argv;
  if (!email || !slug) {
    console.error("usage: grant-purchase.ts <user-email> <book-slug>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url));

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`No user with email ${email}`);

  const [book] = await db.select().from(books).where(eq(books.slug, slug)).limit(1);
  if (!book) throw new Error(`No book with slug ${slug}`);

  const existing = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, user.id), eq(purchases.bookId, book.id)))
    .limit(1);
  if (existing.length > 0) {
    console.log(`Already granted: ${email} owns ${slug}`);
    return;
  }

  await db.insert(purchases).values({
    userId: user.id,
    bookId: book.id,
    stripeSessionId: null,
    amountCents: book.priceCents ?? 0,
    currency: book.currency,
  });
  console.log(`Granted ${slug} to ${email}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
