/**
 * Seeds the DB with all books from the in-tree content/ directory.
 *
 * Discovery is directory-driven: any subdirectory of content/ that contains
 * en/outline.md is treated as a book. Convention: directory name == public
 * slug == source_dir. This means the on-disk layout, the URL, and the DB
 * row line up 1:1 with no translation.
 *
 * Sort order: directories matching /^econ4kids-book(\d+)$/ sort by their
 * number; everything else sorts alphabetically after.
 *
 * Idempotent via UPSERT: updates existing rows and inserts new ones without
 * deleting anything that has user data attached (purchases, book_starts,
 * answers, chat_messages, lesson_completions, student_memories). Orphaned
 * chapters/lessons/questions that no longer exist in the source files ARE
 * cleaned up, but only rows that have no user data referencing them.
 *
 * Run with: npm run db:seed
 *   SEED_BOOKS=econ4kids-book1,constitution npm run db:seed   # subset
 */
import "dotenv/config";
import { resolve, join } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, notInArray, inArray, sql } from "drizzle-orm";
import ws from "ws";
import { books, chapters, lessons, questions } from "../db/schema";
import { parseBook } from "./parse-book";

const PROJECT_ROOT = resolve(__dirname, "..", "..");
const BOOKS_ROOT = resolve(PROJECT_ROOT, "content");
const AUTHOR = "Ryan Semerau";

interface BookTarget {
  dir: string;        // directory name under content/ (also the slug)
  sortOrder: number;  // catalog ordering
}

/** Find every directory under content/ that has en/outline.md. Numbered
 *  econ4kids books sort first by their number; other books sort
 *  alphabetically after the last numbered entry. */
function discoverBooks(): BookTarget[] {
  const all = readdirSync(BOOKS_ROOT).filter((name) => {
    const dir = join(BOOKS_ROOT, name);
    return (
      statSync(dir).isDirectory() &&
      existsSync(join(dir, "en", "outline.md"))
    );
  });

  const numbered: BookTarget[] = [];
  const named: BookTarget[] = [];
  for (const name of all) {
    const m = /^econ4kids-book(\d+)$/.exec(name);
    if (m) {
      numbered.push({ dir: name, sortOrder: Number(m[1]) });
    } else {
      named.push({ dir: name, sortOrder: 0 });
    }
  }
  numbered.sort((a, b) => a.sortOrder - b.sortOrder);
  named.sort((a, b) => a.dir.localeCompare(b.dir));
  const offset = numbered.length > 0 ? numbered[numbered.length - 1].sortOrder : 0;
  named.forEach((b, i) => (b.sortOrder = offset + i + 1));
  return [...numbered, ...named];
}

/** SEED_BOOKS env var filters discovered targets by dir name. */
function filterTargets(targets: BookTarget[]): BookTarget[] {
  const raw = process.env.SEED_BOOKS?.trim();
  if (!raw) return targets;
  const wanted = new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  const filtered = targets.filter((t) => wanted.has(t.dir));
  if (filtered.length === 0) {
    throw new Error(
      `SEED_BOOKS="${raw}" matched no discovered books (have: ${targets.map((t) => t.dir).join(", ")})`
    );
  }
  return filtered;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  if (!existsSync(BOOKS_ROOT)) {
    throw new Error(`Books directory not found: ${BOOKS_ROOT}`);
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  const targets = filterTargets(discoverBooks());
  console.log(`Seeding books: ${targets.map((t) => t.dir).join(", ")}`);

  for (const target of targets) {
    const dir = join(BOOKS_ROOT, target.dir);

    console.log(`Parsing ${target.dir}...`);
    const parsed = parseBook(dir, target.dir, AUTHOR);

    let lessonCount = 0;
    let questionCount = 0;

    await db.transaction(async (tx) => {
      // ── Upsert the book ──────────────────────────────────────────────
      const bookValues = {
        slug: parsed.slug,
        sourceDir: target.dir,
        title: `${parsed.title}${parsed.subtitle ? ": " + parsed.subtitle : ""}`,
        author: parsed.author,
        audience: parsed.audience,
        subjects: parsed.subjects,
        tutorInstructions: parsed.tutorInstructions,
        description: parsed.description,
        introduction: parsed.introduction,
        imageUrl: parsed.imageUrl,
        whatYoullLearn: parsed.whatYoullLearn,
        expectations: parsed.expectations,
        prerequisites: parsed.prerequisites,
        priceCents: parsed.priceCents,
        freeLessonsCount: parsed.freeLessonsCount,
        seriesName: parsed.seriesName,
        seriesOrder: parsed.seriesOrder,
        published: parsed.published,
        sortOrder: target.sortOrder,
      };

      const [bookRow] = await tx
        .insert(books)
        .values(bookValues)
        .onConflictDoUpdate({
          target: books.slug,
          set: {
            sourceDir: sql`excluded.source_dir`,
            title: sql`excluded.title`,
            author: sql`excluded.author`,
            audience: sql`excluded.audience`,
            subjects: sql`excluded.subjects`,
            tutorInstructions: sql`excluded.tutor_instructions`,
            description: sql`excluded.description`,
            introduction: sql`excluded.introduction`,
            imageUrl: sql`excluded.image_url`,
            whatYoullLearn: sql`excluded.what_youll_learn`,
            expectations: sql`excluded.expectations`,
            prerequisites: sql`excluded.prerequisites`,
            priceCents: sql`excluded.price_cents`,
            freeLessonsCount: sql`excluded.free_lessons_count`,
            seriesName: sql`excluded.series_name`,
            seriesOrder: sql`excluded.series_order`,
            published: sql`excluded.published`,
            sortOrder: sql`excluded.sort_order`,
          },
        })
        .returning({ id: books.id });

      const bookId = bookRow.id;

      // ── Build the list of expected chapter numbers ────────────────────
      // Includes chapter 0 (Introduction) if the book has intro text.
      const expectedChapterNumbers = parsed.chapters.map((c) => c.number);
      if (parsed.introduction) {
        expectedChapterNumbers.push(0);
      }

      // ── Upsert chapters ──────────────────────────────────────────────
      // Synthetic "Introduction" pseudo-chapter at number 0.
      if (parsed.introduction) {
        await tx
          .insert(chapters)
          .values({ bookId, number: 0, title: "Introduction", sortOrder: 0 })
          .onConflictDoUpdate({
            target: [chapters.bookId, chapters.number],
            set: {
              title: sql`excluded.title`,
              sortOrder: sql`excluded.sort_order`,
            },
          });
      }

      for (const chap of parsed.chapters) {
        await tx
          .insert(chapters)
          .values({
            bookId,
            number: chap.number,
            title: chap.title,
            sortOrder: chap.number,
          })
          .onConflictDoUpdate({
            target: [chapters.bookId, chapters.number],
            set: {
              title: sql`excluded.title`,
              sortOrder: sql`excluded.sort_order`,
            },
          });
      }

      // Delete chapters that no longer exist in the source files.
      if (expectedChapterNumbers.length > 0) {
        await tx
          .delete(chapters)
          .where(
            and(
              eq(chapters.bookId, bookId),
              notInArray(chapters.number, expectedChapterNumbers)
            )
          );
      }

      // Fetch all chapter rows for this book so we have their IDs.
      const chapterRows = await tx
        .select({ id: chapters.id, number: chapters.number })
        .from(chapters)
        .where(eq(chapters.bookId, bookId));
      const chapterIdByNumber = new Map(chapterRows.map((r) => [r.number, r.id]));

      // ── Upsert intro lesson ──────────────────────────────────────────
      const introChapterId = chapterIdByNumber.get(0);
      if (parsed.introduction && introChapterId) {
        await tx
          .insert(lessons)
          .values({
            chapterId: introChapterId,
            code: "intro",
            title: "Introduction",
            kind: "lesson",
            sortOrder: 0,
          })
          .onConflictDoUpdate({
            target: [lessons.chapterId, lessons.code],
            set: {
              title: sql`excluded.title`,
              kind: sql`excluded.kind`,
              sortOrder: sql`excluded.sort_order`,
            },
          });
        lessonCount++;

        // Clean orphan lessons in intro chapter (should only have "intro").
        await tx
          .delete(lessons)
          .where(
            and(
              eq(lessons.chapterId, introChapterId),
              notInArray(lessons.code, ["intro"])
            )
          );
      }

      // ── Upsert lessons and questions per chapter ─────────────────────
      for (const chap of parsed.chapters) {
        const chapterId = chapterIdByNumber.get(chap.number);
        if (!chapterId) continue;

        const expectedLessonCodes: string[] = [];

        for (const lesson of chap.lessons) {
          expectedLessonCodes.push(lesson.code);

          const [lessonRow] = await tx
            .insert(lessons)
            .values({
              chapterId,
              code: lesson.code,
              title: lesson.title,
              kind: lesson.kind,
              sortOrder: lesson.sortOrder,
            })
            .onConflictDoUpdate({
              target: [lessons.chapterId, lessons.code],
              set: {
                title: sql`excluded.title`,
                kind: sql`excluded.kind`,
                sortOrder: sql`excluded.sort_order`,
              },
            })
            .returning({ id: lessons.id });
          lessonCount++;

          const lessonId = lessonRow.id;

          // Upsert questions.
          const expectedSortOrders: number[] = [];
          for (const q of lesson.questions) {
            expectedSortOrders.push(q.sortOrder);
            await tx
              .insert(questions)
              .values({
                lessonId,
                prompt: q.prompt,
                sortOrder: q.sortOrder,
              })
              .onConflictDoUpdate({
                target: [questions.lessonId, questions.sortOrder],
                set: { prompt: sql`excluded.prompt` },
              });
            questionCount++;
          }

          // Delete questions that no longer exist for this lesson.
          if (expectedSortOrders.length > 0) {
            await tx
              .delete(questions)
              .where(
                and(
                  eq(questions.lessonId, lessonId),
                  notInArray(questions.sortOrder, expectedSortOrders)
                )
              );
          } else {
            // No questions in source -- remove all existing questions.
            await tx.delete(questions).where(eq(questions.lessonId, lessonId));
          }
        }

        // Delete lessons that no longer exist for this chapter.
        if (expectedLessonCodes.length > 0) {
          await tx
            .delete(lessons)
            .where(
              and(
                eq(lessons.chapterId, chapterId),
                notInArray(lessons.code, expectedLessonCodes)
              )
            );
        }
      }
    });

    console.log(
      `  → ${parsed.chapters.length} chapters, ${lessonCount} lessons, ${questionCount} questions`
    );
  }

  console.log("Seeding complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
