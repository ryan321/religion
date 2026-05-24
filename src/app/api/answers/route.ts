import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { answers, books, chapters, questions, lessons } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { answerSubmitSchema } from "@/lib/validation";
import { gradeAnswer } from "@/lib/tutor";
import { recomputeLessonCompletion, getLessonAccess } from "@/lib/workbook";
import { listMemoryStrings } from "@/lib/memories";
import { loadLessonBody } from "@/lib/lesson-content";

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (!session) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = answerSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { questionId, responseText } = parsed.data;

  // Load the question + its lesson context + book instructions so we can grade
  // in context. Lesson body is loaded from the filesystem (MDX), not the DB.
  const [questionRow] = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      lessonId: questions.lessonId,
      lessonCode: lessons.code,
      lessonTitle: lessons.title,
      chapterNumber: chapters.number,
      bookId: books.id,
      bookSlug: books.slug,
      bookSourceDir: books.sourceDir,
      bookInstructions: books.tutorInstructions,
    })
    .from(questions)
    .innerJoin(lessons, eq(lessons.id, questions.lessonId))
    .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!questionRow) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const access = await getLessonAccess(
    session.user.id,
    questionRow.bookId,
    questionRow.lessonId
  );
  if (!access.canAccess) {
    return NextResponse.json(
      { error: "Lesson locked. Purchase the book to continue." },
      { status: 403 }
    );
  }

  const memoryStrings = await listMemoryStrings(session.user.id);
  const locale = await getLocale();
  const lessonBody = questionRow.bookSourceDir
    ? await loadLessonBody({
        bookSlug: questionRow.bookSlug,
        sourceDir: questionRow.bookSourceDir,
        locale,
        chapterNumber: questionRow.chapterNumber,
        lessonCode: questionRow.lessonCode,
      })
    : null;

  let grade;
  try {
    grade = await gradeAnswer({
      lessonTitle: questionRow.lessonTitle,
      lessonBody: lessonBody?.mdx ?? "",
      question: questionRow.prompt,
      studentAnswer: responseText,
      bookInstructions: questionRow.bookInstructions,
      studentMemories: memoryStrings,
      locale,
    });
  } catch (err) {
    console.error("Grader error:", err);
    return NextResponse.json(
      { error: "The grader is unavailable right now. Try again in a moment." },
      { status: 502 }
    );
  }

  // Upsert answer. Increment attempts on conflict.
  await db
    .insert(answers)
    .values({
      userId: session.user.id,
      questionId: questionRow.id,
      responseText,
      status: grade.status,
      aiFeedback: grade.feedback,
      attempts: 1,
    })
    .onConflictDoUpdate({
      target: [answers.userId, answers.questionId],
      set: {
        responseText,
        status: grade.status,
        aiFeedback: grade.feedback,
        attempts: sql`${answers.attempts} + 1`,
        updatedAt: new Date(),
      },
    });

  const lessonCompleted = await recomputeLessonCompletion(
    session.user.id,
    questionRow.lessonId
  );

  return NextResponse.json({
    status: grade.status,
    feedback: grade.feedback,
    lessonCompleted,
  });
}

export async function GET(request: Request) {
  // Light helper: load all answers + question prompts for a lesson.
  // Useful if we need to refresh client state without a full page reload.
  const { session, error } = await requireAuth();
  if (!session) return error;

  const url = new URL(request.url);
  const lessonId = url.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const rows = await db
    .select({
      questionId: questions.id,
      prompt: questions.prompt,
      sortOrder: questions.sortOrder,
      responseText: answers.responseText,
      status: answers.status,
      feedback: answers.aiFeedback,
    })
    .from(questions)
    .leftJoin(
      answers,
      and(
        eq(answers.questionId, questions.id),
        eq(answers.userId, session.user.id)
      )
    )
    .where(eq(questions.lessonId, lessonId))
    .orderBy(asc(questions.sortOrder));

  return NextResponse.json({ questions: rows });
}
