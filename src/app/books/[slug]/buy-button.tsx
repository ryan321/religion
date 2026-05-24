"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function BuyButton({
  bookId,
  priceLabel,
}: {
  bookId: string;
  priceLabel: string;
}) {
  const t = useTranslations("bookDetail");
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? "Something went wrong");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? t("buyLoading") : t("buy", { price: priceLabel })}
    </button>
  );
}
