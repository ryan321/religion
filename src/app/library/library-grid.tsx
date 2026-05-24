"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShelfRow } from "@/components/shelf-row";
import { buildSections } from "@/lib/shelf-grouping";

export interface LibraryBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  imageUrl: string | null;
  subjects: string[] | null;
  seriesName: string | null;
  seriesOrder: number | null;
  isPurchased: boolean;
  hasActivity: boolean;
  completedLessons: number;
  totalLessons: number;
  progress: number;
  continueHref: string | null;
  /** ISO string for JSON serialization from server. */
  lastOpenedAt: string | null;
}

function BookCard({ book }: { book: LibraryBook }) {
  const t = useTranslations("library");
  return (
    <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md sm:w-40">
      <Link
        href={`/library/${book.slug}`}
        className="group block"
        aria-label={book.title}
      >
        <div className="relative">
          {book.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.imageUrl}
              alt={book.title}
              className="aspect-[3/4] w-full object-cover transition group-hover:opacity-90"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-2xl font-bold text-blue-700">
              {book.title.charAt(0)}
            </div>
          )}
          {!book.isPurchased && (
            <div className="absolute top-1.5 right-1.5">
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 shadow-sm">
                {t("preview")}
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-2.5 py-2">
        <Link href={`/library/${book.slug}`} className="group">
          <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-700">
            {book.title}
          </h3>
        </Link>
        <div className="mt-1.5">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>{t("percentComplete", { percent: book.progress })}</span>
            <span>{t("lessonsProgress", { done: book.completedLessons, total: book.totalLessons })}</span>
          </div>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        </div>
        {book.continueHref && (
          <Link
            href={book.continueHref}
            className="mt-2 block rounded bg-blue-600 px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-blue-700"
          >
            {book.hasActivity ? t("continue") : t("start")}
          </Link>
        )}
      </div>
    </div>
  );
}

export function LibraryGrid({ books }: { books: LibraryBook[] }) {
  const t = useTranslations("library");
  const [query, setQuery] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const b of books) {
      for (const s of b.subjects ?? []) set.add(s);
    }
    return [...set].sort();
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (activeSubject && !(b.subjects ?? []).some((s) => s === activeSubject)) {
        return false;
      }
      if (!q) return true;
      const haystack = `${b.title} ${b.author} ${b.seriesName ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [books, query, activeSubject]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pl-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            🔍
          </span>
        </div>
        {allSubjects.length > 0 && (
          <select
            value={activeSubject ?? ""}
            onChange={(e) => setActiveSubject(e.target.value || null)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t("allSubjects")}</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {filtered.length === 1
            ? t("countSingular", { count: filtered.length })
            : t("countPlural", { count: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
          <p className="font-medium">{t("noResults")}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveSubject(null);
            }}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) =>
            section.superTitle ? (
              <div
                key={section.superTitle}
                className="rounded-xl border border-gray-200 bg-white/60 px-5 py-5"
              >
                <h2 className="mb-1 text-lg font-bold text-gray-900">
                  {section.superTitle}
                </h2>
                <p className="mb-4 text-xs text-gray-500">
                  {section.shelves.map((s) => s.name).join(" · ")}
                </p>
                <div className="space-y-6">
                  {section.shelves.map((shelf) => (
                    <ShelfRow key={shelf.name} title={shelf.name}>
                      {shelf.books.map((book) => (
                        <BookCard key={book.id} book={book} />
                      ))}
                    </ShelfRow>
                  ))}
                </div>
              </div>
            ) : (
              section.shelves.map((shelf) => (
                <ShelfRow key={shelf.name} title={shelf.name}>
                  {shelf.books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </ShelfRow>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
