"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import { LanguageList } from "./language-list";

interface Props {
  setLocaleAction: (locale: string) => Promise<void>;
}

/** Standalone locale dropdown for the public TopNav (used when no user is
 *  signed in). Logged-in users get the same picker inside their ProfileMenu. */
export function LanguagePicker({ setLocaleAction }: Props) {
  const t = useTranslations("nav");
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function pick(locale: string) {
    startTransition(async () => {
      await setLocaleAction(locale);
      setOpen(false);
    });
  }

  const current = LOCALES.find((l) => l.code === currentLocale);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
        className="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
      >
        🌐 {current?.nativeName ?? currentLocale}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
            <span>{t("language")}</span>
            <span>{LOCALES.length} languages</span>
          </div>
          {currentLocale !== DEFAULT_LOCALE && (
            <button
              type="button"
              onClick={() => pick(DEFAULT_LOCALE)}
              className="block w-full border-b border-gray-100 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("resetToEnglish")}
            </button>
          )}
          <LanguageList currentLocale={currentLocale} onPick={pick} />
        </div>
      )}
    </div>
  );
}
