import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { signOutAction, setLocaleAction } from "@/lib/actions";
import { ProfileMenu } from "./profile-menu";
import { LanguagePicker } from "./language-picker";

export async function TopNav() {
  const session = await auth();
  const t = await getTranslations("nav");
  const tSite = await getTranslations("site");

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href={session?.user ? "/library" : "/"}
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900"
          >
            <Image src="/logo-icon.png" alt="" width={32} height={32} />
            {tSite("name")}
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link
              href="/books"
              className="text-gray-700 hover:text-gray-900"
            >
              {t("browseBooks")}
            </Link>
            {session?.user && (
              <>
                <Link
                  href="/library"
                  className="text-gray-700 hover:text-gray-900"
                >
                  {t("myLibrary")}
                </Link>
                <Link
                  href="/minds"
                  className="text-gray-700 hover:text-gray-900"
                >
                  Great Minds
                </Link>
              </>
            )}
          </nav>
        </div>
        {session?.user ? (
          <ProfileMenu
            email={session.user.email ?? ""}
            name={session.user.name ?? null}
            signOutAction={signOutAction}
            setLocaleAction={setLocaleAction}
          />
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <LanguagePicker setLocaleAction={setLocaleAction} />
            <Link href="/login" className="text-gray-700 hover:text-gray-900">
              {t("logIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
            >
              {t("signUp")}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
