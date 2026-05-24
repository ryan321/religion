import { db } from "@/db";
import {
  books,
  bookStarts,
  chapters,
  lessons,
  questions,
  answers,
  lessonCompletions,
  purchases,
} from "@/db/schema";
import { eq, asc, desc, and, sql } from "drizzle-orm";

/** Add a book to the user's library (Kindle-style sample). Idempotent. */
export async function startBook(userId: string, bookId: string): Promise<void> {
  await db
    .insert(bookStarts)
    .values({ userId, bookId })
    .onConflictDoNothing();
}

/** Record that the user just opened a lesson in this book. Upserts so a
 *  purchased-but-never-previewed book also gets a library entry. Used to
 *  flip the My Library card label from "Start" → "Continue". */
export async function recordLessonOpen(
  userId: string,
  bookId: string
): Promise<void> {
  const now = new Date();
  await db
    .insert(bookStarts)
    .values({ userId, bookId, lastOpenedAt: now })
    .onConflictDoUpdate({
      target: [bookStarts.userId, bookStarts.bookId],
      set: { lastOpenedAt: now },
    });
}

/** Has the user added this book to their library (started or purchased)? */
export async function hasStartedBook(
  userId: string,
  bookId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: bookStarts.id })
    .from(bookStarts)
    .where(and(eq(bookStarts.userId, userId), eq(bookStarts.bookId, bookId)))
    .limit(1);
  return !!row;
}

export interface LessonSummary {
  id: string;
  code: string;
  title: string;
  kind: "lesson" | "test";
  totalQuestions: number;
  passedQuestions: number;
  completed: boolean;
  /** 1-based index of this lesson within the whole book (sorted by chapter
   *  then by lesson sortOrder). Used for free-preview gating. */
  bookIndex: number;
  /** Free if the user can read it without a purchase. */
  isFree: boolean;
}

export interface ChapterSummary {
  id: string;
  number: number;
  title: string;
  lessons: LessonSummary[];
}

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  author: string;
  audience: string | null;
  imageUrl: string | null;
  subjects: string[] | null;
  seriesName: string | null;
  seriesOrder: number | null;
  freeLessonsCount: number;
  isPurchased: boolean;
  /** True if user has added this to their library (preview or purchased). */
  isStarted: boolean;
  /** True if the user has actually engaged with the book (any answer, chat
   *  message, or completion in any lesson). Distinct from isStarted, which
   *  only means it's been added to the library. */
  hasActivity: boolean;
  /** When the user last opened a lesson in this book. Null if never opened. */
  lastOpenedAt: Date | null;
  chapters: ChapterSummary[];
}

/** Same shape as a single entry from getBooksWithProgress, but loads only one
 *  book by slug. Returns null if not found or not published. */
export async function getBookProgressBySlug(
  slug: string,
  userId: string
): Promise<BookSummary | null> {
  const all = await getBooksWithProgress(userId);
  return all.find((b) => b.slug === slug) ?? null;
}

/** Build the full book → chapter → lesson tree with progress + access info
 *  for a user. Only published books are returned. */
export async function getBooksWithProgress(userId: string): Promise<BookSummary[]> {
  const bookRows = await db
    .select()
    .from(books)
    .where(eq(books.published, true))
    .orderBy(asc(books.sortOrder), asc(books.title));

  if (bookRows.length === 0) return [];

  const chapterRows = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.bookId), asc(chapters.sortOrder));

  const lessonRows = await db
    .select()
    .from(lessons)
    .orderBy(asc(lessons.chapterId), asc(lessons.sortOrder));

  const questionCounts = await db
    .select({
      lessonId: questions.lessonId,
      total: sql<number>`count(*)::int`,
    })
    .from(questions)
    .groupBy(questions.lessonId);

  const passedCounts = await db
    .select({
      lessonId: questions.lessonId,
      passed: sql<number>`count(*)::int`,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(and(eq(answers.userId, userId), eq(answers.status, "passed")))
    .groupBy(questions.lessonId);

  const completionRows = await db
    .select({ lessonId: lessonCompletions.lessonId })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.userId, userId));

  const purchaseRows = await db
    .select({ bookId: purchases.bookId })
    .from(purchases)
    .where(eq(purchases.userId, userId));

  const startRows = await db
    .select({
      bookId: bookStarts.bookId,
      lastOpenedAt: bookStarts.lastOpenedAt,
    })
    .from(bookStarts)
    .where(eq(bookStarts.userId, userId));

  const totalByLesson = new Map(questionCounts.map((r) => [r.lessonId, r.total]));
  const passedByLesson = new Map(passedCounts.map((r) => [r.lessonId, r.passed]));
  const completedSet = new Set(completionRows.map((r) => r.lessonId));
  const purchasedSet = new Set(purchaseRows.map((r) => r.bookId));
  const startedSet = new Set(startRows.map((r) => r.bookId));
  // Activity = the user has opened at least one lesson in the book. Set on
  // every lesson page render via recordLessonOpen.
  const activitySet = new Set(
    startRows.filter((r) => r.lastOpenedAt !== null).map((r) => r.bookId)
  );
  const lastOpenedMap = new Map(
    startRows.map((r) => [r.bookId, r.lastOpenedAt])
  );

  // Group lessons by chapter (already ordered by chapter id, then sortOrder)
  const lessonsByChapter = new Map<string, typeof lessonRows>();
  for (const l of lessonRows) {
    const list = lessonsByChapter.get(l.chapterId) ?? [];
    list.push(l);
    lessonsByChapter.set(l.chapterId, list);
  }

  // Group chapters by book (already ordered by sortOrder)
  const chaptersByBook = new Map<string, typeof chapterRows>();
  for (const c of chapterRows) {
    const list = chaptersByBook.get(c.bookId) ?? [];
    list.push(c);
    chaptersByBook.set(c.bookId, list);
  }

  return bookRows.map((b) => {
    const isPurchased = purchasedSet.has(b.id);
    const freeLessonsCount = b.freeLessonsCount;
    const bookChapters = chaptersByBook.get(b.id) ?? [];

    // Walk chapters → lessons in book order to assign 1-based bookIndex.
    // Intros are universally free and don't consume a slot in the
    // free-preview window — they're skipped in the index sequence.
    let runningIndex = 0;
    const chapterSummaries: ChapterSummary[] = bookChapters.map((c) => {
      const lessonList = lessonsByChapter.get(c.id) ?? [];
      const lessonSummaries: LessonSummary[] = lessonList.map((l) => {
        const isIntro = l.code === "intro";
        if (!isIntro) runningIndex += 1;
        return {
          id: l.id,
          code: l.code,
          title: l.title,
          kind: l.kind,
          totalQuestions: totalByLesson.get(l.id) ?? 0,
          passedQuestions: passedByLesson.get(l.id) ?? 0,
          completed: completedSet.has(l.id),
          bookIndex: isIntro ? 0 : runningIndex,
          isFree: isIntro || runningIndex <= freeLessonsCount,
        };
      });
      return {
        id: c.id,
        number: c.number,
        title: c.title,
        lessons: lessonSummaries,
      };
    });

    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author,
      audience: b.audience,
      imageUrl: b.imageUrl,
      subjects: b.subjects,
      seriesName: b.seriesName,
      seriesOrder: b.seriesOrder,
      freeLessonsCount,
      isPurchased,
      isStarted: isPurchased || startedSet.has(b.id),
      hasActivity: activitySet.has(b.id),
      lastOpenedAt: lastOpenedMap.get(b.id) ?? null,
      chapters: chapterSummaries,
    };
  });
}

export interface CatalogBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  imageUrl: string | null;
  audience: string | null;
  subjects: string[] | null;
  seriesName: string | null;
  seriesOrder: number | null;
  priceCents: number | null;
  currency: string;
  freeLessonsCount: number;
  isPurchased: boolean;
  /** True if user has added this to their library (preview or purchased). */
  isStarted: boolean;
  totalLessons: number;
}

/** All published books for the marketing catalog grid. Includes purchase
 *  and started status when a userId is provided so the cards can show badges. */
export async function getCatalogBooks(
  userId: string | null
): Promise<CatalogBook[]> {
  const bookRows = await db
    .select()
    .from(books)
    .where(eq(books.published, true))
    .orderBy(asc(books.sortOrder), asc(books.title));

  if (bookRows.length === 0) return [];

  const lessonCounts = await db
    .select({
      bookId: chapters.bookId,
      total: sql<number>`count(*)::int`,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .groupBy(chapters.bookId);

  const totalByBook = new Map(lessonCounts.map((r) => [r.bookId, r.total]));

  let purchasedSet = new Set<string>();
  let startedSet = new Set<string>();
  if (userId) {
    const purchaseRows = await db
      .select({ bookId: purchases.bookId })
      .from(purchases)
      .where(eq(purchases.userId, userId));
    purchasedSet = new Set(purchaseRows.map((r) => r.bookId));

    const startRows = await db
      .select({ bookId: bookStarts.bookId })
      .from(bookStarts)
      .where(eq(bookStarts.userId, userId));
    startedSet = new Set(startRows.map((r) => r.bookId));
  }

  return bookRows.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    author: b.author,
    description: b.description,
    imageUrl: b.imageUrl,
    audience: b.audience,
    subjects: b.subjects,
    seriesName: b.seriesName,
    seriesOrder: b.seriesOrder,
    priceCents: b.priceCents,
    currency: b.currency,
    freeLessonsCount: b.freeLessonsCount,
    isPurchased: purchasedSet.has(b.id),
    isStarted: purchasedSet.has(b.id) || startedSet.has(b.id),
    totalLessons: totalByBook.get(b.id) ?? 0,
  }));
}

export interface BookDetail extends CatalogBook {
  introduction: string | null;
  whatYoullLearn: string[] | null;
  expectations: string | null;
  prerequisites: string | null;
  chapters: {
    id: string;
    number: number;
    title: string;
    lessons: { id: string; code: string; title: string; kind: "lesson" | "test"; isFree: boolean }[];
  }[];
}

/** Full book detail by slug — metadata + outline. Returns null if not found
 *  or not published. */
export async function getBookBySlug(
  slug: string,
  userId: string | null
): Promise<BookDetail | null> {
  const [b] = await db
    .select()
    .from(books)
    .where(and(eq(books.slug, slug), eq(books.published, true)))
    .limit(1);
  if (!b) return null;

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, b.id))
    .orderBy(asc(chapters.sortOrder));

  const lessonRows = await db
    .select()
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .where(eq(chapters.bookId, b.id))
    .orderBy(asc(chapters.sortOrder), asc(lessons.sortOrder));

  const isPurchased = userId ? await hasPurchase(userId, b.id) : false;
  const isStarted = isPurchased || (userId ? await hasStartedBook(userId, b.id) : false);

  let runningIndex = 0;
  const lessonsByChapter = new Map<
    string,
    { id: string; code: string; title: string; kind: "lesson" | "test"; isFree: boolean }[]
  >();
  for (const row of lessonRows) {
    const isIntro = row.lessons.code === "intro";
    if (!isIntro) runningIndex += 1;
    const list = lessonsByChapter.get(row.lessons.chapterId) ?? [];
    list.push({
      id: row.lessons.id,
      code: row.lessons.code,
      title: row.lessons.title,
      kind: row.lessons.kind,
      isFree: isIntro || runningIndex <= b.freeLessonsCount,
    });
    lessonsByChapter.set(row.lessons.chapterId, list);
  }

  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    author: b.author,
    description: b.description,
    imageUrl: b.imageUrl,
    audience: b.audience,
    subjects: b.subjects,
    seriesName: b.seriesName,
    seriesOrder: b.seriesOrder,
    priceCents: b.priceCents,
    currency: b.currency,
    freeLessonsCount: b.freeLessonsCount,
    isPurchased,
    isStarted,
    totalLessons: lessonRows.length,
    introduction: b.introduction,
    whatYoullLearn: b.whatYoullLearn,
    expectations: b.expectations,
    prerequisites: b.prerequisites,
    chapters: chapterRows.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      lessons: lessonsByChapter.get(c.id) ?? [],
    })),
  };
}

/** Has this user purchased this book? */
export async function hasPurchase(
  userId: string,
  bookId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.bookId, bookId)))
    .limit(1);
  return !!row;
}

/** Resolve whether a user can access a specific lesson and why. */
export async function getLessonAccess(
  userId: string,
  bookId: string,
  lessonId: string
): Promise<{ canAccess: boolean; isFree: boolean; isPurchased: boolean }> {
  const [book] = await db
    .select({ freeLessonsCount: books.freeLessonsCount })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (!book) return { canAccess: false, isFree: false, isPurchased: false };

  // Walk the book's lessons in book order; the index of the target tells us
  // if it's within free_lessons_count. Intro lessons are always free and
  // don't count toward free_lessons_count.
  const orderedLessons = await db
    .select({ id: lessons.id, code: lessons.code })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.sortOrder), asc(lessons.sortOrder));

  const target = orderedLessons.find((l) => l.id === lessonId);
  const isPurchased = await hasPurchase(userId, bookId);
  if (!target) return { canAccess: false, isFree: false, isPurchased };

  // Intros are universally free.
  if (target.code === "intro") {
    return { canAccess: true, isFree: true, isPurchased };
  }

  // Skip intros when computing the 1-based index so the free preview
  // window (e.g. "first 6 lessons free") refers to real lessons only.
  const realLessons = orderedLessons.filter((l) => l.code !== "intro");
  const idx = realLessons.findIndex((l) => l.id === lessonId) + 1;
  const isFree = idx > 0 && idx <= book.freeLessonsCount;
  return { canAccess: isFree || isPurchased, isFree, isPurchased };
}

/** Load one lesson with its book/chapter context, questions, and the user's
 *  current answer per question (if any). */
export async function getLessonWithContext(
  bookSlug: string,
  lessonCode: string,
  userId: string
) {
  // Resolve the lesson by joining book → chapter → lesson on the unique slug + code path.
  // Note: lesson `code` is unique within a chapter only, so we have to disambiguate
  // by chapter when a lessonCode shows up multiple times across chapters. To keep
  // routing simple we make the lessonCode include the chapter (e.g. "1.2", "test-1").
  // Since codes in seed are "1.2" or "test", we resolve test codes as "test-{N}".
  const isIntro = lessonCode === "intro";
  const isTest = lessonCode.startsWith("test-");
  const chapterNumber = isTest ? Number(lessonCode.replace("test-", "")) : null;
  const lessonCodeInDb = isTest ? "test" : lessonCode;
  // Intro lives in the synthetic chapter 0; tests in their chapter; lessons
  // get their chapter from the leading "N" of "N.M".
  const chapterFilter = isIntro
    ? 0
    : isTest
    ? Number(chapterNumber)
    : Number(lessonCode.split(".")[0]);

  const [row] = await db
    .select({
      bookId: books.id,
      bookTitle: books.title,
      bookSlug: books.slug,
      bookSourceDir: books.sourceDir,
      chapterId: chapters.id,
      chapterNumber: chapters.number,
      chapterTitle: chapters.title,
      lessonId: lessons.id,
      lessonCode: lessons.code,
      lessonTitle: lessons.title,
      lessonKind: lessons.kind,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(
      and(
        eq(books.slug, bookSlug),
        eq(chapters.number, chapterFilter),
        eq(lessons.code, lessonCodeInDb)
      )
    )
    .limit(1);

  if (!row) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.lessonId, row.lessonId))
    .orderBy(asc(questions.sortOrder));

  const answerRows = await db
    .select()
    .from(answers)
    .where(and(eq(answers.userId, userId)));

  const answersByQuestion = new Map(
    answerRows
      .filter((a) => questionRows.some((q) => q.id === a.questionId))
      .map((a) => [a.questionId, a])
  );

  const [completion] = await db
    .select()
    .from(lessonCompletions)
    .where(
      and(
        eq(lessonCompletions.userId, userId),
        eq(lessonCompletions.lessonId, row.lessonId)
      )
    )
    .limit(1);

  return {
    book: {
      id: row.bookId,
      slug: row.bookSlug,
      title: row.bookTitle,
      sourceDir: row.bookSourceDir,
    },
    chapter: {
      id: row.chapterId,
      number: row.chapterNumber,
      title: row.chapterTitle,
    },
    lesson: {
      id: row.lessonId,
      code: row.lessonCode,
      title: row.lessonTitle,
      kind: row.lessonKind,
    },
    questions: questionRows.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      sortOrder: q.sortOrder,
      answer: answersByQuestion.get(q.id) ?? null,
    })),
    completed: !!completion,
  };
}

/** Recompute completion for a lesson: marked complete iff every question on the
 *  lesson has a passed answer. Idempotent. */
export async function recomputeLessonCompletion(userId: string, lessonId: string) {
  const [counts] = await db
    .select({
      total: sql<number>`count(${questions.id})::int`,
      passed: sql<number>`count(case when ${answers.status} = 'passed' then 1 end)::int`,
    })
    .from(questions)
    .leftJoin(
      answers,
      and(eq(answers.questionId, questions.id), eq(answers.userId, userId))
    )
    .where(eq(questions.lessonId, lessonId));

  const isComplete =
    counts && counts.total > 0 && counts.passed === counts.total;

  if (isComplete) {
    await db
      .insert(lessonCompletions)
      .values({ userId, lessonId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          eq(lessonCompletions.lessonId, lessonId)
        )
      );
  }

  return !!isComplete;
}

export interface LessonRef {
  /** URL-safe code: "1.2" for lessons, "test-1" for chapter tests. */
  href: string;
  title: string;
  chapterNumber: number;
  isTest: boolean;
}

/** Returns the previous and next lessons in the same book (across chapters). */
export async function getAdjacentLessons(
  bookSlug: string,
  currentLessonId: string
): Promise<{ prev: LessonRef | null; next: LessonRef | null }> {
  const rows = await db
    .select({
      lessonId: lessons.id,
      lessonCode: lessons.code,
      lessonTitle: lessons.title,
      lessonKind: lessons.kind,
      lessonSortOrder: lessons.sortOrder,
      chapterNumber: chapters.number,
      chapterSortOrder: chapters.sortOrder,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(books.slug, bookSlug))
    .orderBy(asc(chapters.sortOrder), asc(lessons.sortOrder));

  const idx = rows.findIndex((r) => r.lessonId === currentLessonId);
  if (idx === -1) return { prev: null, next: null };

  const toRef = (r: (typeof rows)[number]): LessonRef => {
    const isTest = r.lessonKind === "test";
    return {
      href: isTest ? `test-${r.chapterNumber}` : r.lessonCode,
      title: isTest ? `Chapter ${r.chapterNumber} Test` : r.lessonTitle,
      chapterNumber: r.chapterNumber,
      isTest,
    };
  };

  return {
    prev: idx > 0 ? toRef(rows[idx - 1]) : null,
    next: idx < rows.length - 1 ? toRef(rows[idx + 1]) : null,
  };
}

/** Resolve a bookSlug + lessonCode pair to a lesson id (for API calls). */
export async function resolveLesson(bookSlug: string, lessonCode: string) {
  const isIntro = lessonCode === "intro";
  const isTest = lessonCode.startsWith("test-");
  const chapterFilter = isIntro
    ? 0
    : isTest
    ? Number(lessonCode.replace("test-", ""))
    : Number(lessonCode.split(".")[0]);
  const lessonCodeInDb = isTest ? "test" : lessonCode;

  const [row] = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(
      and(
        eq(books.slug, bookSlug),
        eq(chapters.number, chapterFilter),
        eq(lessons.code, lessonCodeInDb)
      )
    )
    .limit(1);
  return row ?? null;
}

export interface PurchaseSummary {
  bookId: string;
  bookSlug: string;
  bookTitle: string;
  bookImageUrl: string | null;
  amountCents: number;
  currency: string;
  purchasedAt: Date;
}

/** All purchases for a user, most recent first. */
export async function getUserPurchases(
  userId: string
): Promise<PurchaseSummary[]> {
  const rows = await db
    .select({
      bookId: purchases.bookId,
      bookSlug: books.slug,
      bookTitle: books.title,
      bookImageUrl: books.imageUrl,
      amountCents: purchases.amountCents,
      currency: purchases.currency,
      purchasedAt: purchases.purchasedAt,
    })
    .from(purchases)
    .innerJoin(books, eq(books.id, purchases.bookId))
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.purchasedAt));
  return rows;
}
