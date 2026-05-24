import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { listMemories, deleteMemory } from "@/lib/memories";
import { getUserPurchases } from "@/lib/workbook";
import { TopNav } from "@/components/top-nav";

export const dynamic = "force-dynamic";

async function deleteMemoryAction(formData: FormData) {
  "use server";
  const session = await requireUser();
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await deleteMemory(session.user.id, id);
    revalidatePath("/account");
  }
}

export default async function AccountPage() {
  const session = await requireUser();
  const [memories, purchases] = await Promise.all([
    listMemories(session.user.id),
    getUserPurchases(session.user.id),
  ]);
  const t = await getTranslations("account");
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
        </header>

        <section className="mb-8 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {t("profile")}
            </h2>
          </div>
          <dl className="divide-y divide-gray-100 text-sm">
            {session.user.name && (
              <div className="grid grid-cols-3 gap-2 px-4 py-3">
                <dt className="text-gray-500">{t("name")}</dt>
                <dd className="col-span-2 text-gray-900">{session.user.name}</dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <dt className="text-gray-500">{t("email")}</dt>
              <dd className="col-span-2 text-gray-900">{session.user.email}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-8 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {t("purchasesTitle")}
            </h2>
            <span className="text-xs text-gray-500">
              {t("purchaseCount", { count: purchases.length })}
            </span>
          </div>
          {purchases.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">{t("noPurchases")}</p>
              <Link
                href="/books"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                {t("browseCatalog")}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {purchases.map((p) => (
                <li key={p.bookId}>
                  <Link
                    href={`/library/${p.bookSlug}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                  >
                    {p.bookImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.bookImageUrl}
                        alt={p.bookTitle}
                        className="h-12 w-9 flex-shrink-0 rounded border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-blue-50 text-xs font-bold text-blue-700">
                        {p.bookTitle.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.bookTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(p.purchasedAt)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: p.currency,
                        minimumFractionDigits: p.amountCents % 100 === 0 ? 0 : 2,
                      }).format(p.amountCents / 100)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t("memoriesTitle")}
              </h2>
              <p className="text-xs text-gray-500">{t("memoriesHint")}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-500">
              {t("memoryCount", { count: memories.length })}
            </span>
          </div>
          {memories.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              {t("memoriesEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {memories.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <span className="text-sm text-gray-800">{m.content}</span>
                  <form action={deleteMemoryAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      aria-label={t("deleteMemory")}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
