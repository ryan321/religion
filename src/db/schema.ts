import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const lessonKindEnum = pgEnum("lesson_kind", ["lesson", "test"]);
export const answerStatusEnum = pgEnum("answer_status", [
  "pending",
  "partial",
  "passed",
]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  /** Directory name under content/ where this book's source files live.
   *  Decouples the URL slug from the on-disk layout so books with arbitrary
   *  names (e.g. "constitution") work alongside numbered series. Nullable
   *  for backfill compatibility; the seed always populates it. */
  sourceDir: text("source_dir"),
  title: text("title").notNull(),
  author: text("author").notNull(),
  /** Marketing copy for the catalog/details page (1-2 sentences). */
  description: text("description"),
  /** Author's introduction to the book — markdown, rendered on the public
   *  /books/[slug] page only. Distinct from the short description. */
  introduction: text("introduction"),
  /** URL of the cover image displayed on catalog + detail pages. */
  imageUrl: text("image_url"),
  /** Bullet list of "what you'll learn" — array of short strings. */
  whatYoullLearn: jsonb("what_youll_learn").$type<string[]>(),
  /** Free-form expectations / how to use the book. */
  expectations: text("expectations"),
  /** Free-form prerequisites text. */
  prerequisites: text("prerequisites"),
  /** Audience descriptor (e.g. "Ages 7–12"). */
  audience: text("audience"),
  /** Subject tags for catalog filtering (e.g. ["Economics", "Personal Finance"]). */
  subjects: jsonb("subjects").$type<string[]>(),
  /** Series name for grouping related books (e.g. "Economics for Kids"). */
  seriesName: text("series_name"),
  /** Order within the series (1, 2, 3...). NULL if not part of a series. */
  seriesOrder: integer("series_order"),
  /** Per-book tutor system prompt. */
  tutorInstructions: text("tutor_instructions"),
  /** One-time purchase price in the smallest currency unit. NULL = not yet
   *  priced (treated as locked except for free preview). */
  priceCents: integer("price_cents"),
  currency: text("currency").default("USD").notNull(),
  /** Number of lessons (in book sort order) accessible without purchase. */
  freeLessonsCount: integer("free_lessons_count").default(0).notNull(),
  /** Visible in the catalog. Drafts can be hidden by setting to false. */
  published: boolean("published").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Tracks when a user "added" a book to their library — either by starting the
 *  free preview or by purchasing. Mirrors Kindle's "samples in your library"
 *  behavior so the dashboard shows everything the user is actively reading. */
export const bookStarts = pgTable(
  "book_starts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    /** Set every time the user opens a lesson in this book. NULL means they
     *  added it to library but never opened a lesson — drives the
     *  Start vs. Continue label. */
    lastOpenedAt: timestamp("last_opened_at"),
  },
  (t) => [
    unique().on(t.userId, t.bookId),
    index("idx_book_starts_user_id").on(t.userId),
  ]
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    /** Stripe Checkout Session ID. NULL for purchases granted manually
     *  (e.g. admin grants, comp access during dogfooding). */
    stripeSessionId: text("stripe_session_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.bookId),
    index("idx_purchases_user_id").on(t.userId),
  ]
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    unique().on(t.bookId, t.number),
    index("idx_chapters_book_id").on(t.bookId),
  ]
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    kind: lessonKindEnum("kind").notNull().default("lesson"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    unique().on(t.chapterId, t.code),
    index("idx_lessons_chapter_id").on(t.chapterId),
  ]
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    unique().on(t.lessonId, t.sortOrder),
    index("idx_questions_lesson_id").on(t.lessonId),
  ]
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    responseText: text("response_text").notNull(),
    status: answerStatusEnum("status").notNull().default("pending"),
    aiFeedback: text("ai_feedback"),
    attempts: integer("attempts").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.questionId),
    index("idx_answers_user_id").on(t.userId),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_chat_messages_user_lesson").on(t.userId, t.lessonId),
  ]
);

export const lessonCompletions = pgTable(
  "lesson_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.lessonId),
    index("idx_lesson_completions_user").on(t.userId),
  ]
);

export const studentMemories = pgTable(
  "student_memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceLessonId: uuid("source_lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_student_memories_user_id").on(t.userId)]
);

// ---- Great Minds ----

export const greatMinds = pgTable("great_minds", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  years: text("years").notNull(),
  shortBio: text("short_bio").notNull(),
  domain: text("domain").notNull(),
  /** System prompt that defines the character's personality, knowledge, and perspective. */
  systemPrompt: text("system_prompt").notNull(),
  /** Conversation starter prompts shown as buttons before the first message. */
  starters: jsonb("starters").$type<string[]>(),
  /** URL for a portrait/avatar image. */
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Maps which books unlock which great minds.
 *  A mind is unlocked when the user passes the chapter 7 test
 *  (and all prior chapters) in ANY book that references that mind. */
export const greatMindBooks = pgTable(
  "great_mind_books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    greatMindId: uuid("great_mind_id")
      .notNull()
      .references(() => greatMinds.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.greatMindId, t.bookId)]
);

/** Chat messages between a user and a great mind persona. */
export const greatMindMessages = pgTable(
  "great_mind_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    greatMindId: uuid("great_mind_id")
      .notNull()
      .references(() => greatMinds.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_great_mind_messages_user_mind").on(t.userId, t.greatMindId),
  ]
);
