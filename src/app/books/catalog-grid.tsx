"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { CatalogBook } from "@/lib/workbook";
import { ShelfRow } from "@/components/shelf-row";
import { buildSections } from "@/lib/shelf-grouping";

function formatPrice(
  cents: number | null,
  currency: string,
  locale: string,
  comingSoonLabel: string
) {
  if (cents == null) return comingSoonLabel;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

interface CatalogGridProps {
  books: CatalogBook[];
}

function BookCard({ book }: { book: CatalogBook }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group relative flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md sm:w-40"
    >
      <div className="relative">
        {book.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.imageUrl}
            alt={book.title}
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-2xl font-bold text-blue-700">
            {book.title.charAt(0)}
          </div>
        )}
        {book.isPurchased && (
          <div className="absolute bottom-0 inset-x-0 bg-green-600/90 px-2 py-1 text-center text-[10px] font-semibold text-white backdrop-blur-sm">
            {t("youOwn")}
          </div>
        )}
        {!book.isPurchased && book.isStarted && (
          <div className="absolute bottom-0 inset-x-0 bg-blue-600/90 px-2 py-1 text-center text-[10px] font-semibold text-white backdrop-blur-sm">
            {t("inLibrary")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2.5 py-2">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-700">
          {book.title}
        </h3>
        <p className="mt-0.5 text-[10px] text-gray-500 truncate">{book.author}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5 text-[10px] text-gray-500">
          <span className="truncate">{book.audience ?? `${book.totalLessons} lessons`}</span>
          {!book.isPurchased && (
            <span className="font-semibold text-gray-900 whitespace-nowrap ml-1">
              {formatPrice(book.priceCents, book.currency, locale, t("comingSoon"))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CatalogGrid({ books }: CatalogGridProps) {
  const t = useTranslations("catalog");
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
      if (
        activeSubject &&
        !(b.subjects ?? []).some((s) => s === activeSubject)
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = `${b.title} ${b.author} ${b.description ?? ""}`.toLowerCase();
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
