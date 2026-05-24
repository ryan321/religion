"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";

interface ShelfRowProps {
  title: string;
  children: ReactNode;
}

export function ShelfRow({ title, children }: ShelfRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <section className="group/shelf">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute -left-1 top-0 bottom-0 z-10 flex w-10 items-center justify-center bg-gradient-to-r from-gray-50 to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100"
            aria-label="Scroll left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-gray-700 shadow-md ring-1 ring-gray-200">
              &lsaquo;
            </span>
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute -right-1 top-0 bottom-0 z-10 flex w-10 items-center justify-center bg-gradient-to-l from-gray-50 to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100"
            aria-label="Scroll right"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-gray-700 shadow-md ring-1 ring-gray-200">
              &rsaquo;
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
