import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCatalogBooks } from "@/lib/workbook";
import { loadLocalizedBook } from "@/lib/lesson-content";
import { TopNav } from "@/components/top-nav";
import { CatalogGrid } from "./catalog-grid";

export const dynamic = "force-dynamic";

export default async function BooksCatalogPage() {
  const session = await auth();
  const books = await getCatalogBooks(session?.user?.id ?? null);
  const t = await getTranslations("catalog");
  const locale = await getLocale();

  // Overlay localized title/description/audience/subjects from per-locale
  // book.json + outline.md onto each catalog entry. Falls back to en.
  const localized = await Promise.all(
    books.map((b) => loadLocalizedBook({ sourceDir: b.slug, locale }))
  );
  const localizedBooks = books.map((b, i) => ({
    ...b,
    title: localized[i].bookTitle ?? b.title,
    description: localized[i].description ?? b.description,
    audience: localized[i].audience ?? b.audience,
    subjects: localized[i].subjects ?? b.subjects,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {books[0]?.freeLessonsCount
              ? t("intro", { count: books[0].freeLessonsCount })
              : t("introNoCount")}
          </p>
        </div>
        <CatalogGrid books={localizedBooks} />
      </main>
    </div>
  );
}
