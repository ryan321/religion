"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  mindSlug: string;
  mindName: string;
  mindYears: string;
  mindBio: string;
  starters: string[];
  initialMessages: ChatMessage[];
}

export function MindChat({
  mindSlug,
  mindName,
  mindYears,
  mindBio,
  starters,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startersOpen, setStartersOpen] = useState(initialMessages.length === 0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    setBusy(true);
    setStartersOpen(false);

    const tempUserId = `opt-${Date.now()}`;
    const tempAssistantId = `stream-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: tempUserId, role: "user", content: text.trim() },
      { id: tempAssistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/great-minds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mindSlug, message: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let realUserId = tempUserId;
      let realAssistantId = tempAssistantId;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: { type: string; text?: string; id?: string; message?: string };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "user_id" && event.id) {
            realUserId = event.id;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === tempUserId ? { ...msg, id: realUserId } : msg
              )
            );
          } else if (event.type === "delta" && event.text) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === tempAssistantId || msg.id === realAssistantId
                  ? { ...msg, content: msg.content + event.text }
                  : msg
              )
            );
          } else if (event.type === "done" && event.id) {
            realAssistantId = event.id;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === tempAssistantId
                  ? { ...msg, id: realAssistantId }
                  : msg
              )
            );
          } else if (event.type === "error") {
            throw new Error(event.message || "Stream error");
          }
        }
      }
    } catch (err) {
      setMessages((m) =>
        m.filter(
          (x) =>
            (x.id !== tempAssistantId && x.id !== tempUserId) ||
            (x.id === tempAssistantId && x.content.length > 0)
        )
      );
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
    setDraft("");
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/minds"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; All Minds
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {mindName.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{mindName}</h1>
              <p className="text-xs text-gray-500">{mindYears}</p>
            </div>
          </div>
        </div>
        {starters.length > 0 && (
          <button
            type="button"
            onClick={() => setStartersOpen(!startersOpen)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {startersOpen ? "Hide suggestions" : "Conversation ideas"}
          </button>
        )}
      </div>

      {/* Starters - collapsible */}
      {startersOpen && starters.length > 0 && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <div className="flex flex-wrap gap-2">
            {starters.map((starter, i) => (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => send(starter)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-left shadow-sm disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3"
      >
        {messages.length === 0 && !busy && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-blue-600">
                {mindName.charAt(0)}
              </div>
              <p className="text-sm font-medium text-gray-900">{mindName}</p>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                {mindBio}
              </p>
              <p className="mt-4 text-sm text-gray-400">
                Pick a suggestion above or type your own question
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-12 bg-gray-100 text-gray-900"
                : "mr-12 bg-blue-50 text-gray-900"
            }`}
          >
            {m.role === "assistant" && (
              <p className="mb-1 text-xs font-semibold text-blue-600">
                {mindName}
              </p>
            )}
            {m.role === "assistant" ? (
              m.content ? (
                <div className="prose prose-sm max-w-none prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="text-blue-400">Thinking...</span>
              )
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Ask ${mindName} something...`}
            disabled={busy}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
