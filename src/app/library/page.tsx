import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getBooksWithProgress } from "@/lib/workbook";
import { loadLocalizedBook } from "@/lib/lesson-content";
import { TopNav } from "@/components/top-nav";
import { LibraryGrid, type LibraryBook } from "./library-grid";

export const dynamic = "force-dynamic";

function lessonHref(bookSlug: string, lessonCode: string, chapterNumber: number) {
  if (lessonCode === "test") return `/library/${bookSlug}/test-${chapterNumber}`;
  return `/library/${bookSlug}/${lessonCode}`;
}

export default async function LibraryPage() {
  const session = await requireUser();
  const allBooks = await getBooksWithProgress(session.user.id);
  const t = await getTranslations("library");
  const locale = await getLocale();

  const startedBooks = allBooks.filter((b) => b.isStarted);

  // Sort by most recently accessed first. Books with lastOpenedAt come first
  // (newest first), then books that were started but never opened.
  startedBooks.sort((a, b) => {
    const aTime = a.lastOpenedAt?.getTime() ?? 0;
    const bTime = b.lastOpenedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const localizedHeaders = await Promise.all(
    startedBooks.map((b) =>
      loadLocalizedBook({ sourceDir: b.slug, locale })
    )
  );

  const myBooks: LibraryBook[] = startedBooks.map((book, i) => {
    const localized = localizedHeaders[i];
    const totalLessons = book.chapters.reduce(
      (s, c) => s + c.lessons.length,
      0
    );
    const completedLessons = book.chapters.reduce(
      (s, c) => s + c.lessons.filter((l) => l.completed).length,
      0
    );
    const allLessons = book.chapters.flatMap((c) =>
      c.lessons.map((l) => ({ ...l, chapterNumber: c.number }))
    );
    const nextLesson =
      allLessons.find(
        (l) => (l.isFree || book.isPurchased) && !l.completed
      ) ?? allLessons.find((l) => l.isFree || book.isPurchased);
    const progress =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    return {
      id: book.id,
      slug: book.slug,
      title: localized?.bookTitle ?? book.title,
      author: book.author,
      imageUrl: book.imageUrl,
      subjects: book.subjects,
      seriesName: book.seriesName,
      seriesOrder: book.seriesOrder,
      isPurchased: book.isPurchased,
      hasActivity: book.hasActivity,
      completedLessons,
      totalLessons,
      progress,
      continueHref: nextLesson
        ? lessonHref(book.slug, nextLesson.code, nextLesson.chapterNumber)
        : null,
      lastOpenedAt: book.lastOpenedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t.rich("subtitle", {
              browse: (chunks) => (
                <Link href="/books" className="text-blue-600 hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </header>

        {myBooks.length === 0 ? (
          <div className="mb-10 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
            <p className="font-medium">{t("empty")}</p>
            <p className="mt-2 text-sm">{t("emptyHint")}</p>
            <Link
              href="/books"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {t("browseBooks")}
            </Link>
          </div>
        ) : (
          <LibraryGrid books={myBooks} />
        )}
      </div>
    </div>
  );
}
