/**
 * Sets up test users with:
 *   1. Purchases for ALL books
 *   2. Lesson completions for Introduction + all Chapter 1 lessons of econ4kids-book1
 *
 * Usage:
 *   npx tsx scripts/setup-test-users.ts
 *
 * Idempotent -- safe to run multiple times.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import {
  users,
  books,
  purchases,
  bookStarts,
  chapters,
  lessons,
  lessonCompletions,
} from "../src/db/schema";

const TEST_EMAILS = [
  "ryan321@outlook.com",
  "andrew@test.com",
  "michael@test.com",
  "daniel@test.com",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url));

  // Fetch all users and all books up front.
  const allUsers = await db.select().from(users);
  const allBooks = await db.select().from(books);

  const targetUsers = TEST_EMAILS.map((email) => {
    const user = allUsers.find((u) => u.email === email);
    if (!user) {
      console.warn(`  ⚠ User not found: ${email} -- skipping`);
    }
    return user;
  }).filter(Boolean) as (typeof allUsers)[number][];

  if (targetUsers.length === 0) {
    console.error("No matching users found. Exiting.");
    process.exit(1);
  }

  console.log(
    `Found ${targetUsers.length} user(s): ${targetUsers.map((u) => u.email).join(", ")}`
  );
  console.log(`Found ${allBooks.length} book(s) to grant.`);

  // ── Grant all books to each user ──────────────────────────────────────
  for (const user of targetUsers) {
    for (const book of allBooks) {
      // Upsert purchase.
      await db
        .insert(purchases)
        .values({
          userId: user.id,
          bookId: book.id,
          stripeSessionId: null,
          amountCents: book.priceCents ?? 0,
          currency: book.currency,
        })
        .onConflictDoNothing();

      // Upsert book_start so it shows in their library.
      await db
        .insert(bookStarts)
        .values({
          userId: user.id,
          bookId: book.id,
        })
        .onConflictDoNothing();
    }
    console.log(`  ✓ Granted all ${allBooks.length} books to ${user.email}`);
  }

  // ── Mark Introduction + Chapter 1 of econ4kids-book1 as complete ──────
  const econ1 = allBooks.find((b) => b.slug === "econ4kids-book1");
  if (!econ1) {
    console.warn("  ⚠ econ4kids-book1 not found -- skipping completions");
  } else {
    // Get intro chapter (number 0) and chapter 1.
    const targetChapters = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.bookId, econ1.id),
        )
      );

    // Get the intro chapter (number 0) and chapter 1.
    const introChapter = targetChapters.find((c) => c.number === 0);
    const ch1 = targetChapters.find((c) => c.number === 1);

    const targetLessons: { id: string; code: string }[] = [];

    // Get the "intro" lesson from chapter 0.
    if (introChapter) {
      const [introLesson] = await db
        .select()
        .from(lessons)
        .where(
          and(
            eq(lessons.chapterId, introChapter.id),
            eq(lessons.code, "intro")
          )
        );
      if (introLesson) targetLessons.push(introLesson);
    }

    // Get lesson 1.1 from chapter 1.
    if (ch1) {
      const [lesson11] = await db
        .select()
        .from(lessons)
        .where(
          and(eq(lessons.chapterId, ch1.id), eq(lessons.code, "1.1"))
        );
      if (lesson11) targetLessons.push(lesson11);
    }

    if (targetLessons.length === 0) {
      console.warn("  ⚠ No intro/lesson 1.1 found for econ4kids-book1");
    } else {
      for (const user of targetUsers) {
        for (const lesson of targetLessons) {
          await db
            .insert(lessonCompletions)
            .values({
              userId: user.id,
              lessonId: lesson.id,
            })
            .onConflictDoNothing();
        }
        console.log(
          `  ✓ Marked ${targetLessons.length} lesson(s) complete for ${user.email} in econ4kids-book1 (intro + 1.1)`
        );
      }
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
