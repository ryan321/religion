import { db } from "@/db";
import { studentMemories } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

const MAX_MEMORIES = 50;

export interface StudentMemory {
  id: string;
  content: string;
  createdAt: Date;
}

export async function listMemories(userId: string): Promise<StudentMemory[]> {
  const rows = await db
    .select({
      id: studentMemories.id,
      content: studentMemories.content,
      createdAt: studentMemories.createdAt,
    })
    .from(studentMemories)
    .where(eq(studentMemories.userId, userId))
    .orderBy(asc(studentMemories.createdAt));
  return rows;
}

export async function listMemoryStrings(userId: string): Promise<string[]> {
  const rows = await listMemories(userId);
  return rows.map((r) => r.content);
}

export async function insertMemories(
  userId: string,
  contents: string[],
  sourceLessonId: string | null
): Promise<number> {
  const cleaned = contents
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && c.length <= 200);
  if (cleaned.length === 0) return 0;

  // Avoid runaway growth: cap at MAX_MEMORIES per user.
  const existing = await db
    .select({ id: studentMemories.id, content: studentMemories.content })
    .from(studentMemories)
    .where(eq(studentMemories.userId, userId));

  const existingLower = new Set(existing.map((r) => r.content.toLowerCase()));
  const seats = MAX_MEMORIES - existing.length;
  if (seats <= 0) return 0;

  const fresh = cleaned
    .filter((c) => !existingLower.has(c.toLowerCase()))
    .slice(0, seats);
  if (fresh.length === 0) return 0;

  await db.insert(studentMemories).values(
    fresh.map((content) => ({
      userId,
      content,
      sourceLessonId,
    }))
  );
  return fresh.length;
}

export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const deleted = await db
    .delete(studentMemories)
    .where(
      and(eq(studentMemories.userId, userId), eq(studentMemories.id, memoryId))
    )
    .returning({ id: studentMemories.id });
  return deleted.length > 0;
}
