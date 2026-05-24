/**
 * POST /api/great-minds
 * Chat with a great mind persona. Streams the response via SSE.
 *
 * Body: { mindSlug: string, message: string }
 * Streams: text chunks, then a final JSON line with message IDs.
 */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import {
  getGreatMindBySlug,
  isMindUnlocked,
  getMindChatHistory,
  saveMindMessage,
} from "@/lib/great-minds";

const MODEL = process.env.GREAT_MINDS_MODEL ?? "claude-sonnet-4-6";
const MAX_HISTORY = 20;
const MAX_TOKENS = 400;

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (!session) return error;

  let body: { mindSlug?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mindSlug, message } = body;
  if (!mindSlug || !message?.trim()) {
    return NextResponse.json(
      { error: "mindSlug and message required" },
      { status: 400 }
    );
  }

  const mind = await getGreatMindBySlug(mindSlug);
  if (!mind) {
    return NextResponse.json({ error: "Mind not found" }, { status: 404 });
  }

  const unlocked = await isMindUnlocked(session.user.id, mind.id);
  if (!unlocked) {
    return NextResponse.json(
      { error: "This mind is not yet unlocked" },
      { status: 403 }
    );
  }

  const history = await getMindChatHistory(
    session.user.id,
    mind.id,
    MAX_HISTORY
  );
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message.trim() },
  ];

  const systemPrompt = `${mind.systemPrompt}

The student's name is ${session.user.name}. They are a young student (roughly age 7-12) who has been studying ${mind.domain} through their workbooks.

Communicate the way this person actually would - their speech patterns, vocabulary, interests, sense of humor, and way of thinking. You know how this person talked and thought. Do that. Don't narrate or describe what you would say - just say it. Keep it natural and conversational, not theatrical or performative.

NEVER start a response with "Ah," or "Ah!" or "Oh," or any exclamation. Just start talking naturally. Avoid overusing hyphens and dashes - prefer periods and shorter sentences instead.`;

  // Save user message immediately
  const userMsg = await saveMindMessage(
    session.user.id,
    mind.id,
    "user",
    message.trim()
  );

  // Stream the response
  const userId = session.user.id;
  const mindId = mind.id;

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";

      // Send user message ID first
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "user_id", id: userMsg.id })}\n\n`)
      );

      stream.on("text", (text) => {
        fullText += text;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`)
        );
      });

      stream.on("end", async () => {
        // Save complete assistant message
        const assistantMsg = await saveMindMessage(
          userId,
          mindId,
          "assistant",
          fullText.trim()
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", id: assistantMsg.id })}\n\n`
          )
        );
        controller.close();
      });

      stream.on("error", (err) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
          )
        );
        controller.close();
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
