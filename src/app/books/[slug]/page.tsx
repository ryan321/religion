import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getBookBySlug } from "@/lib/workbook";
import { getGreatMindsForBook } from "@/lib/great-minds";
import {
  loadLocalizedBook,
  loadLocalizedLessonTitles,
} from "@/lib/lesson-content";
import { TopNav } from "@/components/top-nav";
import { startBookAction } from "@/lib/actions";
import { BuyButton } from "./buy-button";

export const dynamic = "force-dynamic";

function formatPrice(
  cents: number | null,
  currency: string,
  locale: string,
  comingSoon: string
) {
  if (cents == null) return comingSoon;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const book = await getBookBySlug(slug, session?.user?.id ?? null);
  if (!book) notFound();

  const t = await getTranslations("bookDetail");
  const tCatalog = await getTranslations("catalog");
  const tLesson = await getTranslations("lesson");
  const locale = await getLocale();
  const isSignedIn = !!session?.user;
  const hasPreview = book.freeLessonsCount > 0 && book.chapters.length > 0;
  const priceLabel = formatPrice(
    book.priceCents,
    book.currency,
    locale,
    tCatalog("comingSoon")
  );

  // Localized overlays for every overridable book field + chapter titles.
  const localized = await loadLocalizedBook({ sourceDir: book.slug, locale });
  // Lesson titles need a separate batch read (one file per lesson).
  const lessonTargets = book.chapters.flatMap((c) =>
    c.lessons
      .filter((l) => l.kind !== "test")
      .map((l) => ({ chapterNumber: c.number, code: l.code }))
  );
  const localizedLessonTitles = await loadLocalizedLessonTitles({
    sourceDir: book.slug,
    locale,
    lessons: lessonTargets,
  });

  const greatMinds = await getGreatMindsForBook(book.id, session?.user?.id ?? null);

  const display = {
    title: localized.bookTitle ?? book.title,
    description: localized.description ?? book.description,
    audience: localized.audience ?? book.audience,
    subjects: localized.subjects ?? book.subjects,
    expectations: localized.expectations ?? book.expectations,
    prerequisites: localized.prerequisites ?? book.prerequisites,
    whatYoullLearn: localized.whatYoullLearn ?? book.whatYoullLearn,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-4">
          <Link
            href="/books"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            {t("allBooks")}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
          <div>
            {book.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.imageUrl}
                alt={display.title}
                className="aspect-[3/4] w-full rounded-lg border border-gray-200 bg-white object-cover shadow-sm"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-br from-blue-100 to-blue-200 text-5xl font-bold text-blue-700 shadow-sm">
                {display.title.charAt(0)}
              </div>
            )}
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {book.isPurchased ? tCatalog("owned") : priceLabel}
                </span>
                {!book.isPurchased && book.priceCents != null && (
                  <span className="text-xs text-gray-500">{t("oneTime")}</span>
                )}
              </div>
              {book.isPurchased ? (
                <Link
                  href={`/library/${book.slug}`}
                  className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {t("openInLibrary")}
                </Link>
              ) : (
                <>
                  {isSignedIn && book.priceCents != null ? (
                    <BuyButton bookId={book.id} priceLabel={priceLabel} />
                  ) : book.priceCents != null ? (
                    <Link
                      href={`/login?next=/books/${book.slug}`}
                      className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      {t("buy", { price: priceLabel })}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block w-full cursor-not-allowed rounded-md bg-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-600"
                    >
                      {t("comingSoon")}
                    </button>
                  )}
                  {hasPreview && (
                    isSignedIn ? (
                      <form action={startBookAction} className="mt-2">
                        <input type="hidden" name="bookId" value={book.id} />
                        <input
                          type="hidden"
                          name="bookSlug"
                          value={book.slug}
                        />
                        <button
                          type="submit"
                          className="block w-full rounded-md border border-blue-600 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {t("startFreePreview")}
                        </button>
                      </form>
                    ) : (
                      <Link
                        href={`/login?next=/books/${book.slug}`}
                        className="mt-2 block w-full rounded-md border border-blue-600 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        {t("signInToPreview")}
                      </Link>
                    )
                  )}
                  <p className="mt-3 text-xs text-gray-500">
                    {book.freeLessonsCount > 0
                      ? t("freePreviewNote", { count: book.freeLessonsCount })
                      : t("noFreePreview")}
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {display.title}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t("by", { author: book.author })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {display.audience && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {display.audience}
                </span>
              )}
              {display.subjects?.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                >
                  {s}
                </span>
              ))}
            </div>

            {display.description && (
              <p className="mt-6 text-base leading-relaxed text-gray-700">
                {display.description}
              </p>
            )}

            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("contents")}
                </h2>
                <span className="text-xs text-gray-500">
                  {book.freeLessonsCount > 0
                    ? t("contentsSummaryWithFree", {
                        chapters: book.chapters.length,
                        lessons: book.totalLessons,
                        free: book.freeLessonsCount,
                      })
                    : t("contentsSummary", {
                        chapters: book.chapters.length,
                        lessons: book.totalLessons,
                      })}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {book.chapters.map((chapter) => {
                  const isIntroChapter = chapter.number === 0;
                  return (
                    <div
                      key={chapter.id}
                      className="rounded-lg border border-gray-200 bg-white"
                    >
                      {!isIntroChapter && (
                        <div className="border-b border-gray-100 px-4 py-2">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {chapter.number} · {localized.chapterTitles.get(chapter.number) ?? chapter.title}
                          </h3>
                        </div>
                      )}
                      <ul className="divide-y divide-gray-100">
                        {chapter.lessons.map((lesson) => {
                          const accessible = lesson.isFree || book.isPurchased;
                          const lessonTitle =
                            localizedLessonTitles.get(lesson.code) ?? lesson.title;
                          const label =
                            lesson.code === "intro"
                              ? tLesson("introduction")
                              : lesson.kind === "test"
                              ? tLesson("test", { number: chapter.number })
                              : `${lesson.code} · ${lessonTitle}`;
                          return (
                            <li
                              key={lesson.id}
                              className="flex items-center justify-between gap-3 px-4 py-2"
                            >
                              <span
                                className={`text-sm ${
                                  book.isPurchased || accessible ? "text-gray-900" : "text-gray-500"
                                }`}
                              >
                                {label}
                              </span>
                              {!book.isPurchased && (
                                accessible ? (
                                  <span className="text-xs font-medium text-green-700">
                                    {t("free")}
                                  </span>
                                ) : (
                                  <span
                                    className="text-xs text-gray-400"
                                    aria-label={t("locked")}
                                  >
                                    🔒
                                  </span>
                                )
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            {display.whatYoullLearn && display.whatYoullLearn.length > 0 && (
              <section className="mt-10">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("whatYoullLearn")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {display.whatYoullLearn.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-1 text-blue-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {greatMinds.length > 0 && (
              <section className="mt-10">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("unlocksGreatMinds")}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {greatMinds.some((m) => m.unlocked)
                    ? t("unlocksGreatMindsHint")
                    : t("unlocksGreatMindsLocked")}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {greatMinds.map((mind) =>
                    mind.unlocked ? (
                      <Link
                        key={mind.id}
                        href={`/minds/${mind.slug}`}
                        className="group flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 transition hover:border-green-300 hover:shadow-sm"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                          {mind.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800">
                            {mind.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {mind.years} · {mind.domain}
                          </p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {t("chat")}
                        </span>
                      </Link>
                    ) : (
                      <div
                        key={mind.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 opacity-75"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                          {mind.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {mind.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {mind.years} · {mind.domain}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400" aria-label={t("locked")}>
                          🔒
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {display.expectations && (
              <section className="mt-8">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("howToUseThisBook")}
                </h2>
                <p className="mt-2 text-sm text-gray-700">{display.expectations}</p>
              </section>
            )}

            {display.prerequisites && (
              <section className="mt-8">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("prerequisites")}
                </h2>
                <p className="mt-2 text-sm text-gray-700">
                  {display.prerequisites}
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
