"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface Mind {
  id: string;
  slug: string;
  name: string;
  years: string;
  shortBio: string;
  domain: string;
  imageUrl: string | null;
  unlocked: boolean;
}

export function MindsGrid({ minds }: { minds: Mind[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return minds;
    return minds.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q) ||
        m.shortBio.toLowerCase().includes(q) ||
        m.years.includes(q)
    );
  }, [minds, query]);

  return (
    <>
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, subject, or era..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <p className="font-medium">No minds match your search.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mind) => (
            <div
              key={mind.id}
              className={`relative rounded-xl border p-5 transition ${
                mind.unlocked
                  ? "border-blue-200 bg-white shadow-sm hover:shadow-md"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                    mind.unlocked
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {mind.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {mind.name}
                  </h2>
                  <p className="text-xs text-gray-500">{mind.years}</p>
                </div>
              </div>

              <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                {mind.shortBio}
              </p>

              <p className="mb-4 text-xs text-gray-400">{mind.domain}</p>

              {mind.unlocked ? (
                <Link
                  href={`/minds/${mind.slug}`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Start conversation
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                  Complete chapter 7 to unlock
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
