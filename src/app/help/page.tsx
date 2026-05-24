import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TopNav } from "@/components/top-nav";

export default async function HelpPage() {
  const t = await getTranslations("help");

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

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">
              {t("browsingTitle")}
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>{t("browsingStep1")}</p>
              <p>{t("browsingStep2")}</p>
              <p>{t("browsingStep3")}</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">
              {t("buyingTitle")}
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>{t("buyingStep1")}</p>
              <p>{t("buyingStep2")}</p>
              <p>{t("buyingStep3")}</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">
              {t("libraryTitle")}
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>{t("libraryStep1")}</p>
              <p>{t("libraryStep2")}</p>
              <p>{t("libraryStep3")}</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">
              {t("accountTitle")}
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>{t("accountStep1")}</p>
              <p>{t("accountStep2")}</p>
              <p>{t("accountStep3")}</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">
              {t("supportTitle")}
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>{t("supportBody")}</p>
              <p>
                <a
                  href="mailto:support@bestsubjects.com"
                  className="text-blue-600 hover:underline"
                >
                  support@bestsubjects.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
