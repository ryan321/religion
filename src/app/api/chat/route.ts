import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, chapters, chatMessages, lessons, questions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { chatSendSchema } from "@/lib/validation";
import { tutorReply, extractMemories } from "@/lib/tutor";
import { listMemoryStrings, insertMemories } from "@/lib/memories";
import { loadLessonBody } from "@/lib/lesson-content";
import { getLessonAccess } from "@/lib/workbook";

const MAX_HISTORY_TURNS = 20;

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (!session) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { lessonId, message } = parsed.data;

  const [lessonRow] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      code: lessons.code,
      bookId: books.id,
      bookSlug: books.slug,
      bookSourceDir: books.sourceDir,
      chapterNumber: chapters.number,
      bookInstructions: books.tutorInstructions,
    })
    .from(lessons)
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lessonRow) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const access = await getLessonAccess(
    session.user.id,
    lessonRow.bookId,
    lessonRow.id
  );
  if (!access.canAccess) {
    return NextResponse.json(
      { error: "Lesson locked. Purchase the book to continue." },
      { status: 403 }
    );
  }

  const locale = await getLocale();
  const lessonBody = lessonRow.bookSourceDir
    ? await loadLessonBody({
        bookSlug: lessonRow.bookSlug,
        sourceDir: lessonRow.bookSourceDir,
        locale,
        chapterNumber: lessonRow.chapterNumber,
        lessonCode: lessonRow.code,
      })
    : null;

  const lessonQuestions = await db
    .select({ prompt: questions.prompt })
    .from(questions)
    .where(eq(questions.lessonId, lessonId))
    .orderBy(asc(questions.sortOrder));

  const history = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, session.user.id),
        eq(chatMessages.lessonId, lessonId)
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const memoryStrings = await listMemoryStrings(session.user.id);

  let assistantText: string;
  try {
    assistantText = await tutorReply({
      lessonTitle: lessonRow.title,
      lessonBody: lessonBody?.mdx ?? "",
      lessonQuestions: lessonQuestions.map((q) => q.prompt),
      bookInstructions: lessonRow.bookInstructions,
      studentMemories: memoryStrings,
      locale,
      history: trimmedHistory,
      userMessage: message,
    });
  } catch (err) {
    console.error("Tutor error:", err);
    return NextResponse.json(
      { error: "The tutor is unavailable right now. Try again in a moment." },
      { status: 502 }
    );
  }

  if (!assistantText) {
    return NextResponse.json(
      { error: "The tutor returned an empty reply." },
      { status: 502 }
    );
  }

  // Persist user + assistant turns. Could batch into a single insert.
  const inserted = await db
    .insert(chatMessages)
    .values([
      {
        userId: session.user.id,
        lessonId,
        role: "user",
        content: message,
      },
      {
        userId: session.user.id,
        lessonId,
        role: "assistant",
        content: assistantText,
      },
    ])
    .returning({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
    });

  // Best-effort memory extraction. Adds ~500ms but means the next turn already
  // has the new memory. If extraction fails we silently skip — the chat reply
  // is the user-visible result and we don't want to surface a memory hiccup.
  try {
    const newMemories = await extractMemories({
      existingMemories: memoryStrings,
      userMessage: message,
      assistantMessage: assistantText,
    });
    if (newMemories.length > 0) {
      await insertMemories(session.user.id, newMemories, lessonId);
    }
  } catch (err) {
    console.error("Memory extraction failed:", err);
  }

  return NextResponse.json({
    userMessage: inserted[0],
    assistantMessage: inserted[1],
  });
}
