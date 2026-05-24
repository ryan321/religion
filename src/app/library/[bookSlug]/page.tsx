import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getBookProgressBySlug } from "@/lib/workbook";
import {
  loadLocalizedHeader,
  loadLocalizedLessonTitles,
} from "@/lib/lesson-content";
import { TopNav } from "@/components/top-nav";

export const dynamic = "force-dynamic";

function lessonHref(bookSlug: string, lessonCode: string, chapterNumber: number) {
  if (lessonCode === "test") return `/library/${bookSlug}/test-${chapterNumber}`;
  return `/library/${bookSlug}/${lessonCode}`;
}

export default async function BookOutlinePage({
  params,
}: {
  params: Promise<{ bookSlug: string }>;
}) {
  const { bookSlug } = await params;
  const session = await requireUser();
  const book = await getBookProgressBySlug(bookSlug, session.user.id);
  if (!book) notFound();

  const t = await getTranslations("bookHome");
  const tDetail = await getTranslations("bookDetail");
  const tLib = await getTranslations("library");
  const tLesson = await getTranslations("lesson");
  const locale = await getLocale();

  // Localized titles from per-locale outline.md + per-lesson H3 headers
  // (falls back to en for any missing translation).
  const lessonTargets = book.chapters.flatMap((c) =>
    c.lessons
      .filter((l) => l.kind !== "test")
      .map((l) => ({ chapterNumber: c.number, code: l.code }))
  );
  const [localizedHeader, localizedLessonTitles] = await Promise.all([
    loadLocalizedHeader({ sourceDir: bookSlug, locale }),
    loadLocalizedLessonTitles({
      sourceDir: bookSlug,
      locale,
      lessons: lessonTargets,
    }),
  ]);
  const displayBookTitle = localizedHeader.bookTitle ?? book.title;

  const totalLessons = book.chapters.reduce(
    (s, c) => s + c.lessons.length,
    0
  );
  const completedLessons = book.chapters.reduce(
    (s, c) => s + c.lessons.filter((l) => l.completed).length,
    0
  );
  const progress =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const allLessons = book.chapters.flatMap((c) =>
    c.lessons.map((l) => ({ ...l, chapterNumber: c.number }))
  );
  const nextLesson =
    allLessons.find((l) => (l.isFree || book.isPurchased) && !l.completed) ??
    allLessons.find((l) => l.isFree || book.isPurchased);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 text-sm">
          <Link href="/library" className="text-gray-500 hover:text-gray-900">
            {t("myLibrary")}
          </Link>
        </div>

        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="md:w-48 md:shrink-0">
            {book.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.imageUrl}
                alt={book.title}
                className="aspect-[3/4] w-full rounded-lg border border-gray-200 bg-white object-cover shadow-sm"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-br from-blue-100 to-blue-200 text-4xl font-bold text-blue-700 shadow-sm">
                {book.title.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {displayBookTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {tDetail("by", { author: book.author })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {book.audience && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {book.audience}
                </span>
              )}
              {!book.isPurchased && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {t("previewBadge", { count: book.freeLessonsCount })}
                </span>
              )}
              {book.isPurchased && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {t("owned")}
                </span>
              )}
              {book.subjects?.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>{tLib("percentComplete", { percent: progress })}</span>
                <span>
                  {tLib("lessonsProgress", {
                    done: completedLessons,
                    total: totalLessons,
                  })}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {nextLesson && (
                <Link
                  href={lessonHref(
                    book.slug,
                    nextLesson.code,
                    nextLesson.chapterNumber
                  )}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {book.hasActivity
                    ? t("continueReading")
                    : t("startReading")}
                </Link>
              )}
              {!book.isPurchased && (
                <Link
                  href={`/books/${book.slug}`}
                  className="inline-flex items-center justify-center rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  {t("buyFullBook")}
                </Link>
              )}
            </div>
          </div>
        </header>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("contents")}
          </h2>
          <div className="space-y-3">
            {book.chapters.map((chapter) => {
              const isIntroChapter = chapter.number === 0;
              const lessonRows = chapter.lessons.map((lesson) => {
                const accessible = lesson.isFree || book.isPurchased;
                const href = accessible
                  ? lessonHref(book.slug, lesson.code, chapter.number)
                  : `/books/${book.slug}`;
                const lessonTitle =
                  localizedLessonTitles.get(lesson.code) ?? lesson.title;
                const label =
                  lesson.code === "intro"
                    ? tLesson("introduction")
                    : lesson.kind === "test"
                    ? tLesson("test", { number: chapter.number })
                    : `${lesson.code} · ${lessonTitle}`;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={href}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
                      title={accessible ? undefined : t("lockedHint")}
                    >
                      <div className="flex items-center gap-3">
                        {accessible ? (
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                              lesson.completed
                                ? "border-green-600 bg-green-600 text-white"
                                : "border-gray-300 text-transparent"
                            }`}
                            aria-hidden
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="flex h-5 w-5 items-center justify-center text-xs text-gray-400"
                            aria-label={tDetail("locked")}
                          >
                            🔒
                          </span>
                        )}
                        <span
                          className={`text-sm ${
                            accessible ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {lesson.totalQuestions > 0
                          ? `${lesson.passedQuestions} / ${lesson.totalQuestions}`
                          : "—"}
                      </span>
                    </Link>
                  </li>
                );
              });

              return (
                <div
                  key={chapter.id}
                  className="rounded-lg border border-gray-200 bg-white"
                >
                  {!isIntroChapter && (
                    <div className="border-b border-gray-100 px-4 py-2">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {chapter.number} · {localizedHeader.chapterTitles.get(chapter.number) ?? chapter.title}
                      </h3>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100">{lessonRows}</ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
