import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/top-nav";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/library");

  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-white">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white">
        <div className="mx-auto max-w-3xl px-6 pt-14 pb-16 text-center">
          <Image
            src="/logo-medium.png"
            alt="Best Subjects"
            width={160}
            height={160}
            className="mx-auto mb-8"
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl leading-[1.15]">
            {t("hero")}
          </h1>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
            {t("heroSub")}
          </p>
          <div className="mt-10 mx-auto max-w-2xl grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-5 shadow-sm">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <span className="text-sm font-medium text-gray-900 text-center">{t("feature1")}</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-5 shadow-sm">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <span className="text-sm font-medium text-gray-900 text-center">{t("feature2")}</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-5 shadow-sm">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 text-center">{t("feature3")}</span>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/books"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              {t("startFree")}
            </Link>
            <Link
              href="/books"
              className="rounded-lg px-6 py-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 transition-colors"
            >
              {t("browseSubjects")}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 text-center">
            {t("planTitle")}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {(["step1", "step2", "step3", "step4"] as const).map((key, i) => (
              <div
                key={key}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 flex gap-4"
              >
                <div className="flex-none flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {t(`${key}Title`)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                    {t(key)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI tutor */}
      <section className="bg-blue-50/50 py-14">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex items-start gap-4">
            <div className="flex-none flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {t("tutorTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {t("tutorBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing + Language — side by side on desktop */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              {t("pricingTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {t("pricingBody")}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              {t("languageTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {t("languageBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            {t("ctaSub")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-5 flex-wrap">
            <svg className="w-6 h-6 text-white animate-bounce-x hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
            <Link
              href="/books"
              className="inline-block rounded-xl bg-white px-10 py-4 text-base font-bold text-blue-600 shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all"
            >
              {t("startFree")}
            </Link>
            <Link
              href="/books"
              className="inline-block rounded-xl px-10 py-4 text-base font-semibold text-white ring-2 ring-white/50 hover:ring-white transition-colors"
            >
              {t("browseSubjects")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
