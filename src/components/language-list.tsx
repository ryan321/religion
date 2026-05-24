"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, type LocaleInfo } from "@/i18n/locales";

interface LanguageListProps {
  currentLocale: string;
  onPick: (locale: string) => void;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matches(locale: LocaleInfo, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  return (
    normalize(locale.englishName).includes(q) ||
    normalize(locale.nativeName).includes(q) ||
    locale.code.toLowerCase().startsWith(q)
  );
}

export function LanguageList({ currentLocale, onPick }: LanguageListProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the search input when mounted
    inputRef.current?.focus();
  }, []);

  const filtered = LOCALES.filter((loc) => matches(loc, query));

  return (
    <>
      <div className="border-b border-gray-100 px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
        />
      </div>
      <ul className="max-h-80 overflow-y-auto py-1 text-sm">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-center text-sm text-gray-400">
            No languages found
          </li>
        ) : (
          filtered.map((loc) => {
            const isActive = loc.code === currentLocale;
            return (
              <li key={loc.code}>
                <button
                  type="button"
                  onClick={() => onPick(loc.code)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${
                    isActive
                      ? "bg-blue-50 font-medium text-blue-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  dir={loc.rtl ? "rtl" : "ltr"}
                >
                  <span className="truncate">{loc.nativeName}</span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {loc.englishName}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}
