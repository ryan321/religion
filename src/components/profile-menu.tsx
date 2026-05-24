"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import { LanguageList } from "./language-list";

interface ProfileMenuProps {
  email: string;
  name: string | null;
  signOutAction: () => Promise<void>;
  setLocaleAction: (locale: string) => Promise<void>;
}

function initials(email: string, name: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

export function ProfileMenu({
  email,
  name,
  signOutAction,
  setLocaleAction,
}: ProfileMenuProps) {
  const t = useTranslations("nav");
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowLanguages(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setShowLanguages(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function handlePickLocale(locale: string) {
    startTransition(async () => {
      await setLocaleAction(locale);
      setOpen(false);
      setShowLanguages(false);
    });
  }

  const currentLocaleInfo = LOCALES.find((l) => l.code === currentLocale);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm ring-2 ring-transparent transition hover:ring-blue-200 focus:outline-none focus:ring-blue-300"
      >
        {initials(email, name)}
      </button>
      {open && !showLanguages && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            {name && (
              <p className="truncate text-sm font-medium text-gray-900">
                {name}
              </p>
            )}
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          <div className="py-1 text-sm">
            <Link
              href="/library"
              role="menuitem"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {t("myLibrary")}
            </Link>
            <Link
              href="/account"
              role="menuitem"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {t("myAccount")}
            </Link>
            <Link
              href="/books"
              role="menuitem"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {t("browseBooks")}
            </Link>
            <Link
              href="/help"
              role="menuitem"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {t("help")}
            </Link>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => setShowLanguages(true)}
            className="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <span>{t("language")}</span>
            <span className="text-xs text-gray-500">
              {currentLocaleInfo?.nativeName ?? currentLocale} →
            </span>
          </button>
          {currentLocale !== DEFAULT_LOCALE && (
            <button
              type="button"
              role="menuitem"
              onClick={() => handlePickLocale(DEFAULT_LOCALE)}
              className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("resetToEnglish")}
            </button>
          )}
          <form action={signOutAction} className="border-t border-gray-100">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
      {open && showLanguages && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowLanguages(false)}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              ← {t("language")}
            </button>
            <span className="text-xs text-gray-500">
              {LOCALES.length} languages
            </span>
          </div>
          <LanguageList currentLocale={currentLocale} onPick={handlePickLocale} />
        </div>
      )}
    </div>
  );
}
