"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lessonCompletions } from "@/db/schema";
import { signOut, requireUser } from "@/lib/auth";
import { startBook } from "@/lib/workbook";
import { isValidLocale, DEFAULT_LOCALE } from "@/i18n/locales";
import { LOCALE_COOKIE } from "@/i18n/request";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Persist a UI locale choice. Falls back to default if unsupported. */
export async function setLocaleAction(locale: string) {
  const target = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, target, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  // Revalidate so server-rendered messages reload in the new language.
  revalidatePath("/", "layout");
}

/** Mark a lesson complete without going through the question-grading
 *  pipeline. Used by the intro lesson's "Mark as read" button.
 *  Idempotent — does nothing if the row already exists. */
export async function markLessonReadAction(formData: FormData) {
  const session = await requireUser();
  const lessonId = formData.get("lessonId");
  if (typeof lessonId !== "string" || !lessonId) {
    throw new Error("lessonId is required");
  }
  await db
    .insert(lessonCompletions)
    .values({ userId: session.user.id, lessonId })
    .onConflictDoNothing();
  revalidatePath("/library", "layout");
}

/** Add a book to the user's library (Kindle-style sample) and send them to
 *  the book's outline page. */
export async function startBookAction(formData: FormData) {
  const session = await requireUser();
  const bookId = formData.get("bookId");
  const bookSlug = formData.get("bookSlug");
  if (typeof bookId !== "string" || typeof bookSlug !== "string") {
    throw new Error("bookId and bookSlug are required");
  }
  await startBook(session.user.id, bookId);
  redirect(`/library/${bookSlug}`);
}
