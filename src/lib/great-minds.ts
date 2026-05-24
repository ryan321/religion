/**
 * Query helpers for the Great Minds feature.
 *
 * A great mind is "unlocked" for a user when they have passed the chapter 7
 * test (and all prior chapter tests) in any book linked to that mind.
 */
import { db } from "@/db";
import {
  greatMinds,
  greatMindBooks,
  greatMindMessages,
  chapters,
  lessons,
  lessonCompletions,
} from "@/db/schema";
import { eq, and, asc, lte, inArray, sql } from "drizzle-orm";

/** The chapter number through which all tests must be passed to unlock. */
const UNLOCK_THROUGH_CHAPTER = 7;

export interface GreatMindSummary {
  id: string;
  slug: string;
  name: string;
  years: string;
  shortBio: string;
  domain: string;
  imageUrl: string | null;
  unlocked: boolean;
}

export interface GreatMindDetail extends GreatMindSummary {
  systemPrompt: string;
  starters: string[];
}

/** Get all great minds with unlock status for a user. Uses 3 bulk queries. */
export async function getGreatMindsForUser(
  userId: string
): Promise<GreatMindSummary[]> {
  // 1. All minds + all mind-book links in parallel
  const [allMinds, links] = await Promise.all([
    db.select().from(greatMinds).orderBy(asc(greatMinds.sortOrder)),
    db
      .select({
        greatMindId: greatMindBooks.greatMindId,
        bookId: greatMindBooks.bookId,
      })
      .from(greatMindBooks),
  ]);

  // Collect all unique book IDs referenced by any mind
  const allBookIds = [...new Set(links.map((l) => l.bookId))];
  if (allBookIds.length === 0) {
    return allMinds.map((m) => ({ ...mindToSummary(m), unlocked: false }));
  }

  // 2. For each referenced book, count how many ch1-7 tests exist and how
  //    many the user has completed. One query with GROUP BY.
  const unlockData = await db
    .select({
      bookId: chapters.bookId,
      totalTests: sql<number>`count(distinct ${lessons.id})::int`,
      completedTests: sql<number>`count(distinct ${lessonCompletions.lessonId})::int`,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .leftJoin(
      lessonCompletions,
      and(
        eq(lessonCompletions.lessonId, lessons.id),
        eq(lessonCompletions.userId, userId)
      )
    )
    .where(
      and(
        inArray(chapters.bookId, allBookIds),
        lte(chapters.number, UNLOCK_THROUGH_CHAPTER),
        eq(lessons.kind, "test")
      )
    )
    .groupBy(chapters.bookId);

  // Build a set of book IDs where the user has completed all ch1-7 tests
  const unlockedBookIds = new Set<string>();
  for (const row of unlockData) {
    if (row.totalTests > 0 && row.completedTests >= row.totalTests) {
      unlockedBookIds.add(row.bookId);
    }
  }

  // Group book IDs by mind
  const booksByMind = new Map<string, string[]>();
  for (const link of links) {
    const list = booksByMind.get(link.greatMindId) ?? [];
    list.push(link.bookId);
    booksByMind.set(link.greatMindId, list);
  }

  // A mind is unlocked if ANY of its linked books is in the unlocked set
  return allMinds.map((mind) => {
    const mindBookIds = booksByMind.get(mind.id) ?? [];
    const unlocked = mindBookIds.some((id) => unlockedBookIds.has(id));
    return { ...mindToSummary(mind), unlocked };
  });
}

function mindToSummary(mind: typeof greatMinds.$inferSelect): Omit<GreatMindSummary, "unlocked"> {
  return {
    id: mind.id,
    slug: mind.slug,
    name: mind.name,
    years: mind.years,
    shortBio: mind.shortBio,
    domain: mind.domain,
    imageUrl: mind.imageUrl,
  };
}

/** Get the great minds linked to a specific book, with unlock status when
 *  a userId is provided. */
export async function getGreatMindsForBook(
  bookId: string,
  userId: string | null = null
): Promise<GreatMindSummary[]> {
  const rows = await db
    .select({
      id: greatMinds.id,
      slug: greatMinds.slug,
      name: greatMinds.name,
      years: greatMinds.years,
      shortBio: greatMinds.shortBio,
      domain: greatMinds.domain,
      imageUrl: greatMinds.imageUrl,
    })
    .from(greatMindBooks)
    .innerJoin(greatMinds, eq(greatMinds.id, greatMindBooks.greatMindId))
    .where(eq(greatMindBooks.bookId, bookId))
    .orderBy(asc(greatMinds.sortOrder));

  if (!userId || rows.length === 0) {
    return rows.map((r) => ({ ...r, unlocked: false }));
  }

  // Check unlock status for each mind
  const unlockStatuses = await Promise.all(
    rows.map((r) => isMindUnlocked(userId, r.id))
  );
  return rows.map((r, i) => ({ ...r, unlocked: unlockStatuses[i] }));
}

/** Get a single great mind by slug (with full system prompt). */
export async function getGreatMindBySlug(
  slug: string
): Promise<GreatMindDetail | null> {
  const [mind] = await db
    .select()
    .from(greatMinds)
    .where(eq(greatMinds.slug, slug))
    .limit(1);
  if (!mind) return null;
  return {
    ...mindToSummary(mind),
    systemPrompt: mind.systemPrompt,
    starters: (mind.starters as string[]) ?? [],
    unlocked: false, // caller must check
  };
}

/** Check if a specific mind is unlocked for a user. */
export async function isMindUnlocked(
  userId: string,
  mindId: string
): Promise<boolean> {
  const links = await db
    .select({ bookId: greatMindBooks.bookId })
    .from(greatMindBooks)
    .where(eq(greatMindBooks.greatMindId, mindId));

  if (links.length === 0) return false;
  const bookIds = links.map((l) => l.bookId);

  const unlockData = await db
    .select({
      bookId: chapters.bookId,
      totalTests: sql<number>`count(distinct ${lessons.id})::int`,
      completedTests: sql<number>`count(distinct ${lessonCompletions.lessonId})::int`,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .leftJoin(
      lessonCompletions,
      and(
        eq(lessonCompletions.lessonId, lessons.id),
        eq(lessonCompletions.userId, userId)
      )
    )
    .where(
      and(
        inArray(chapters.bookId, bookIds),
        lte(chapters.number, UNLOCK_THROUGH_CHAPTER),
        eq(lessons.kind, "test")
      )
    )
    .groupBy(chapters.bookId);

  return unlockData.some(
    (row) => row.totalTests > 0 && row.completedTests >= row.totalTests
  );
}

/** Get chat history for a user with a great mind. */
export async function getMindChatHistory(
  userId: string,
  greatMindId: string,
  limit = 40
) {
  const rows = await db
    .select({
      id: greatMindMessages.id,
      role: greatMindMessages.role,
      content: greatMindMessages.content,
      createdAt: greatMindMessages.createdAt,
    })
    .from(greatMindMessages)
    .where(
      and(
        eq(greatMindMessages.userId, userId),
        eq(greatMindMessages.greatMindId, greatMindId)
      )
    )
    .orderBy(asc(greatMindMessages.createdAt));

  return rows.slice(-limit);
}

/** Save a message in the great mind chat. */
export async function saveMindMessage(
  userId: string,
  greatMindId: string,
  role: "user" | "assistant",
  content: string
) {
  const [row] = await db
    .insert(greatMindMessages)
    .values({ userId, greatMindId, role, content })
    .returning({ id: greatMindMessages.id });
  return row;
}
