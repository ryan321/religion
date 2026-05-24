"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AnswerStatus } from "@/types";

interface LessonRef {
  href: string;
  title: string;
  chapterNumber: number;
  isTest: boolean;
}

interface QuestionState {
  id: string;
  prompt: string;
  currentText: string;
  status: AnswerStatus | null;
  feedback: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  headerLabel: string;
  /** Pre-rendered MDX content from the lesson .mdx file. Empty for tests. */
  bodyContent: ReactNode;
  isTest: boolean;
  /** Synthetic intro lesson — render the body, no questions, completion via
   *  an explicit "Mark as read" button instead of question grading. */
  isIntro: boolean;
  bookSlug: string;
  lessonCode: string;
  lessonId: string;
  initialCompleted: boolean;
  prevLesson: LessonRef | null;
  nextLesson: LessonRef | null;
  initialQuestions: QuestionState[];
  initialMessages: ChatMessage[];
  /** Server action to mark this lesson complete without grading. Only used
   *  for the intro lesson. */
  markLessonReadAction: (formData: FormData) => Promise<void>;
}

const STATUS_CLASSES: Record<AnswerStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  partial: "bg-yellow-100 text-yellow-900",
  passed: "bg-green-100 text-green-900",
};
const STATUS_KEY: Record<AnswerStatus, "tryAgain" | "almost" | "passed"> = {
  pending: "tryAgain",
  partial: "almost",
  passed: "passed",
};

export function LessonClient({
  headerLabel,
  bodyContent,
  isTest,
  isIntro,
  bookSlug,
  lessonId,
  initialCompleted,
  prevLesson,
  nextLesson,
  initialQuestions,
  initialMessages,
  markLessonReadAction,
}: Props) {
  const t = useTranslations("lesson");
  const [questions, setQuestions] = useState<QuestionState[]>(initialQuestions);
  const [completed, setCompleted] = useState(initialCompleted);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chatBusy]);

  // Block copy/cut/context-menu on the entire lesson page so kids
  // can't copy content out to an AI.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("copy", block);
    el.addEventListener("cut", block);
    el.addEventListener("contextmenu", block);
    return () => {
      el.removeEventListener("copy", block);
      el.removeEventListener("cut", block);
      el.removeEventListener("contextmenu", block);
    };
  }, []);

  // Block paste on answer textareas and the chat input so kids
  // can't paste AI-generated responses.
  const blockPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
  }, []);

  function updateQuestion(id: string, patch: Partial<QuestionState>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || chatBusy) return;
    const text = draft.trim();
    setDraft("");
    setChatError(null);
    setChatBusy(true);

    // Optimistically render the user message.
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, message: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Tutor request failed");
      }
      const data: { userMessage: ChatMessage; assistantMessage: ChatMessage } =
        await res.json();
      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        data.userMessage,
        data.assistantMessage,
      ]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setChatError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChatBusy(false);
    }
  }

  async function submitAnswer(question: QuestionState) {
    if (!question.currentText.trim()) return;
    updateQuestion(question.id, { status: null, feedback: t("checking") });
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          responseText: question.currentText,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not check the answer");
      }
      const data: {
        status: AnswerStatus;
        feedback: string;
        lessonCompleted: boolean;
      } = await res.json();
      updateQuestion(question.id, {
        status: data.status,
        feedback: data.feedback,
      });
      if (data.lessonCompleted !== completed) setCompleted(data.lessonCompleted);
    } catch (err) {
      updateQuestion(question.id, {
        status: null,
        feedback: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  return (
    <main ref={mainRef} className={`mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 ${isTest ? "" : "lg:grid-cols-[1fr_400px]"}`}>
      <article className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{headerLabel}</h1>
          {isTest && (
            <p className="mt-1 text-sm text-gray-600">
              {t("testCompleteHint")}
            </p>
          )}
        </div>

        {bodyContent && (
          <div className="no-select prose prose-sm max-w-none rounded-lg bg-white p-6 shadow-sm prose-headings:font-semibold prose-p:text-gray-800 prose-li:text-gray-800">
            {bodyContent}
          </div>
        )}

        <section className="space-y-4">
          {isIntro ? (
            // Intro lessons have no questions — just a "Mark as read"
            // checkbox-style confirmation. Hides itself once completed.
            !completed && (
              <form
                action={markLessonReadAction}
                className="rounded-lg bg-white p-5 text-sm shadow-sm"
              >
                <input type="hidden" name="lessonId" value={lessonId} />
                <p className="mb-3 text-gray-700">{t("introReadyHint")}</p>
                <button
                  type="submit"
                  onClick={() => setCompleted(true)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {t("markAsRead")}
                </button>
              </form>
            )
          ) : (
            <h2 className="text-lg font-semibold text-gray-900">{t("questions")}</h2>
          )}
          {!isIntro && (questions.length === 0 ? (
            <p className="rounded-lg bg-white p-4 text-sm text-gray-600 shadow-sm">
              {t("noQuestions")}
            </p>
          ) : (
            <ol className="space-y-4">
              {questions.map((q, idx) => {
                return (
                  <li
                    key={q.id}
                    className="rounded-lg bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {idx + 1}. {q.prompt}
                      </p>
                      {q.status && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[q.status]}`}
                        >
                          {t(STATUS_KEY[q.status])}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={q.currentText}
                      onChange={(e) =>
                        updateQuestion(q.id, { currentText: e.target.value })
                      }
                      onPaste={blockPaste}
                      rows={3}
                      className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={t("answerShortPlaceholder")}
                      disabled={q.status === "passed"}
                    />
                    {q.feedback && (
                      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        {q.feedback}
                      </p>
                    )}
                    {q.status !== "passed" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => submitAnswer(q)}
                          disabled={!q.currentText.trim()}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t("checkAnswer")}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          ))}

          {completed && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-green-50 p-4 text-sm text-green-900">
              <span>{isIntro ? t("introCompleted") : t("passedAll")}</span>
              {nextLesson && (
                <Link
                  href={`/library/${bookSlug}/${nextLesson.href}`}
                  className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  {t("next", { title: nextLesson.title })}
                </Link>
              )}
            </div>
          )}

          <nav className="flex items-center justify-between gap-3 pt-2">
            {prevLesson ? (
              <Link
                href={`/library/${bookSlug}/${prevLesson.href}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}
            {nextLesson ? (
              <Link
                href={`/library/${bookSlug}/${nextLesson.href}`}
                className={`text-sm font-medium ${
                  completed
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-blue-700 hover:text-blue-900"
                }`}
              >
                {nextLesson.title} →
              </Link>
            ) : (
              <span className="text-sm text-gray-500">{t("endOfBook")}</span>
            )}
          </nav>
        </section>
      </article>

      {!isTest && (
        <aside>
          <div
            className="lg:sticky lg:top-6 flex flex-col rounded-xl border border-blue-200 bg-blue-50/40 shadow-md overflow-hidden"
            style={{ height: "calc(100vh - 11rem)", maxHeight: "calc(100vh - 11rem)" }}
          >
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-blue-900">{t("tutor")}</h3>
              <p className="text-xs text-blue-600/70">{t("tutorHintFull")}</p>
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.length === 0 && !chatBusy && (
                <p className="text-sm text-blue-400 italic">{t("tutorEmptyExample")}</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "ml-6 whitespace-pre-wrap bg-white text-gray-900 border border-gray-200"
                      : "prose prose-sm mr-6 max-w-none bg-blue-100 text-gray-900 prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              ))}
              {chatBusy && (
                <div className="mr-6 rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-600">
                  {t("tutorThinking")}
                </div>
              )}
              {chatError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {chatError}
                </div>
              )}
            </div>

            <div className="border-t border-blue-200 bg-white p-3">
              <form onSubmit={sendMessage}>
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPaste={blockPaste}
                    placeholder={t("tutorAskPlaceholder")}
                    disabled={chatBusy}
                    className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || chatBusy}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("send")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}
