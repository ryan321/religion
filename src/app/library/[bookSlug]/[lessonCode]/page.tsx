import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import {
  getLessonWithContext,
  getAdjacentLessons,
  getLessonAccess,
  recordLessonOpen,
} from "@/lib/workbook";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import {
  loadLessonBody,
  loadLocalizedBook,
  loadLocalizedHeader,
  loadLocalizedLessonTitles,
  loadLocalizedQuestions,
} from "@/lib/lesson-content";
import { lessonComponents } from "@/components/lesson-blocks";
import { TopNav } from "@/components/top-nav";
import { markLessonReadAction } from "@/lib/actions";
import { LessonClient } from "./lesson-client";

export const dynamic = "force-dynamic";

interface Params {
  bookSlug: string;
  lessonCode: string;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await requireUser();
  const { bookSlug, lessonCode } = await params;

  const ctx = await getLessonWithContext(bookSlug, lessonCode, session.user.id);
  if (!ctx) notFound();

  const tLesson = await getTranslations("lesson");
  const tPaywall = await getTranslations("paywall");

  const access = await getLessonAccess(
    session.user.id,
    ctx.book.id,
    ctx.lesson.id
  );

  if (!access.canAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
            <Link
              href="/library"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {tPaywall("myLibrary")}
            </Link>
            <div className="text-sm text-gray-600 truncate">
              {ctx.book.title}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tPaywall("title", { bookTitle: ctx.book.title })}
          </h1>
          <p className="mt-3 text-sm text-gray-600">{tPaywall("subtitle")}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/books/${ctx.book.slug}`}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {tPaywall("viewDetails")}
            </Link>
            <Link
              href="/library"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {tPaywall("backToLibrary")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Mark this book as "in progress" so the My Library card label flips
  // from Start to Continue. Idempotent upsert.
  await recordLessonOpen(session.user.id, ctx.book.id);

  const adjacent = await getAdjacentLessons(bookSlug, ctx.lesson.id);

  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, session.user.id),
        eq(chatMessages.lessonId, ctx.lesson.id)
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  // Read MDX body from the authoring repo and render server-side.
  // - Tests have no body (just questions).
  // - Intros use book.json's `introduction` field instead of a per-lesson
  //   file; we load it via loadLocalizedBook so the locale-overlay applies.
  const locale = await getLocale();
  const isIntro = ctx.lesson.code === "intro";
  let bodyMdx: string | null = null;
  let lessonTitleFromFile: string | null = null;
  if (isIntro && ctx.book.sourceDir) {
    const localizedBook = await loadLocalizedBook({
      sourceDir: ctx.book.sourceDir,
      locale,
    });
    bodyMdx = localizedBook.introduction ?? null;
  } else if (ctx.book.sourceDir) {
    const body = await loadLessonBody({
      bookSlug: ctx.book.slug,
      sourceDir: ctx.book.sourceDir,
      locale,
      chapterNumber: ctx.chapter.number,
      lessonCode: ctx.lesson.code === "test" ? "test" : ctx.lesson.code,
    });
    bodyMdx = body?.mdx ?? null;
    lessonTitleFromFile = body?.title ?? null;
  }

  // Pull localized book + chapter titles from the per-locale outline.md.
  // Falls back to English outline if no localized version exists; the DB
  // values stay as a final fallback.
  const localizedHeader = ctx.book.sourceDir
    ? await loadLocalizedHeader({
        sourceDir: ctx.book.sourceDir,
        locale,
      })
    : { bookTitle: null, chapterTitles: new Map<number, string>() };
  const displayBookTitle = localizedHeader.bookTitle ?? ctx.book.title;

  // Question prompts are stored in the DB in English. Read the per-locale
  // lesson file to overlay translated prompts by position (the Nth question
  // in the file corresponds to the Nth question in the DB, since the seed
  // walks the file top-to-bottom).
  const localizedQuestions = ctx.book.sourceDir
    ? await loadLocalizedQuestions({
        sourceDir: ctx.book.sourceDir,
        locale,
        chapterNumber: ctx.chapter.number,
        lessonCode: ctx.lesson.code === "test" ? "test" : ctx.lesson.code,
      })
    : null;

  // Overlay localized titles on the prev/next nav refs. Tests use the
  // shared `lesson.test` translation key; lessons reuse the batch
  // lesson-title loader.
  const adjLessonTargets = [adjacent.prev, adjacent.next]
    .filter((r): r is NonNullable<typeof adjacent.prev> => !!r && !r.isTest)
    .map((r) => ({ chapterNumber: r.chapterNumber, code: r.href }));
  const adjLocalizedTitles =
    ctx.book.sourceDir && adjLessonTargets.length > 0
      ? await loadLocalizedLessonTitles({
          sourceDir: ctx.book.sourceDir,
          locale,
          lessons: adjLessonTargets,
        })
      : new Map<string, string>();
  const localizeRef = (r: typeof adjacent.prev) => {
    if (!r) return null;
    if (r.isTest) {
      return { ...r, title: tLesson("test", { number: r.chapterNumber }) };
    }
    return { ...r, title: adjLocalizedTitles.get(r.href) ?? r.title };
  };
  const prevLesson = localizeRef(adjacent.prev);
  const nextLesson = localizeRef(adjacent.next);
  const displayChapterTitle =
    localizedHeader.chapterTitles.get(ctx.chapter.number) ?? ctx.chapter.title;
  const displayLessonTitle = lessonTitleFromFile ?? ctx.lesson.title;

  const headerLabel = isIntro
    ? tLesson("introduction")
    : ctx.lesson.kind === "test"
    ? tLesson("test", { number: ctx.chapter.number })
    : tLesson("lessonLabel", {
        code: ctx.lesson.code,
        title: displayLessonTitle,
      });

  const bodyContent =
    bodyMdx && bodyMdx.trim().length > 0 ? (
      <MDXRemote
        source={bodyMdx}
        components={lessonComponents}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/library/${ctx.book.slug}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {tLesson("allChapters")}
            </Link>
            <div className="min-w-0 text-sm text-gray-600 truncate">
              <span>{displayBookTitle}</span>
              <span className="mx-2 text-gray-300">/</span>
              <span>
                {ctx.chapter.number}. {displayChapterTitle}
              </span>
            </div>
          </div>
          {ctx.completed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {tLesson("completed")}
            </span>
          )}
        </div>
      </header>

      <LessonClient
        key={ctx.lesson.id}
        headerLabel={headerLabel}
        bodyContent={bodyContent}
        isTest={ctx.lesson.kind === "test"}
        isIntro={isIntro}
        bookSlug={ctx.book.slug}
        lessonCode={lessonCode}
        lessonId={ctx.lesson.id}
        initialCompleted={ctx.completed}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
        initialQuestions={ctx.questions.map((q, i) => ({
          id: q.id,
          prompt: localizedQuestions?.[i] ?? q.prompt,
          currentText: q.answer?.responseText ?? "",
          status: q.answer?.status ?? null,
          feedback: q.answer?.aiFeedback ?? null,
        }))}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
        markLessonReadAction={markLessonReadAction}
      />
    </div>
  );
}
