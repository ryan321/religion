/**
 * Parses a book directory (content/<dir>/en/) into a structured Book object
 * suitable for seeding into the DB.
 *
 * Expected file layout per book:
 *   outline.md                    -- title + subtitle + chapter list
 *   chapters/N/M.md               -- one file per lesson (N = chapter, M = lesson within chapter)
 *   chapters/N/test.md            -- chapter test (questions only)
 *
 * Each lesson file format:
 *   ### Lesson N.M — Title
 *   ...body markdown...
 *   #### Questions
 *   1. question text
 *   ...
 *   ☐ Completed Lesson N.M
 *
 * Chapter title comes from outline.md. Per-lesson body is read at render
 * time by lib/lesson-content.ts; this seed only extracts the lesson code,
 * title, and end-of-lesson questions.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ParsedQuestion {
  prompt: string;
  sortOrder: number;
}

export interface ParsedLesson {
  code: string;
  title: string;
  kind: "lesson" | "test";
  sortOrder: number;
  questions: ParsedQuestion[];
}

export interface ParsedChapter {
  number: number;
  title: string;
  lessons: ParsedLesson[];
}

export interface ParsedBook {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  /** Optional: human-readable audience descriptor (e.g. "Ages 7–12"). */
  audience: string | null;
  /** Subject tags for catalog filtering. */
  subjects: string[] | null;
  /** Optional: book-specific instructions injected into the tutor + grader
   *  system prompts. Sourced from book.json. */
  tutorInstructions: string | null;
  /** Marketing copy for the catalog/details page (1-2 sentences). */
  description: string | null;
  /** Author's longer-form introduction (markdown). Public details page only. */
  introduction: string | null;
  imageUrl: string | null;
  whatYoullLearn: string[] | null;
  expectations: string | null;
  prerequisites: string | null;
  /** One-time purchase price in cents (USD). NULL = not yet priced. */
  priceCents: number | null;
  /** Number of lessons (book sort order) free to read without purchase. */
  freeLessonsCount: number;
  /** Series name for grouping (e.g. "Economics for Kids"). */
  seriesName: string | null;
  /** Order within the series (1, 2, 3...). */
  seriesOrder: number | null;
  published: boolean;
  chapters: ParsedChapter[];
}

interface BookMeta {
  audience?: string;
  subjects?: string[];
  series_name?: string;
  series_order?: number;
  tutor_instructions?: string;
  description?: string;
  introduction?: string;
  image_url?: string;
  what_youll_learn?: string[];
  expectations?: string;
  prerequisites?: string;
  price_cents?: number;
  free_lessons_count?: number;
  published?: boolean;
}

function parseBookMeta(path: string): BookMeta {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as BookMeta;
    throw new Error("book.json must be a JSON object");
  } catch (err) {
    throw new Error(
      `Failed to parse ${path}: ${(err as Error).message}`
    );
  }
}

// Locale-agnostic — match any "### <words> N.M <words> [— : -] <title>"
// (translations vary the prefix word; the N.M code is universal). The
// separator class includes the CJK fullwidth colon (：) for Chinese/Japanese.
const LESSON_HEADER_RE = /^###\s+.*?(\d+\.\d+).*?[—–\-:：]\s*(.+?)\s*$/;
// Any H4 marks the start of the questions section ("Questions",
// "Preguntas", "Fragen", "問題", ...).
const QUESTIONS_HEADER_RE = /^####\s+/;
// The ☐ checkbox terminates each lesson's question list.
const COMPLETED_RE = /^☐\s/;
const NUMBERED_QUESTION_RE = /^\s*(\d+)\.\s+(.+?)\s*$/;
const BLANK_FILLER_RE = /^\s*_+\s*$/;

function parseQuestions(lines: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let current: string[] | null = null;

  const flush = () => {
    if (current && current.length) {
      const prompt = current.join(" ").replace(/\s+/g, " ").trim();
      if (prompt) {
        questions.push({ prompt, sortOrder: questions.length });
      }
    }
    current = null;
  };

  for (const raw of lines) {
    if (BLANK_FILLER_RE.test(raw)) continue;
    const m = NUMBERED_QUESTION_RE.exec(raw);
    if (m) {
      flush();
      current = [m[2]];
    } else if (current) {
      const trimmed = raw.trim();
      if (trimmed) current.push(trimmed);
    }
  }
  flush();
  return questions;
}

/** Extract just the questions block from one lesson file: skip everything
 *  before the H4, take everything after until ☐. Works regardless of
 *  whether the file ends with a completion marker. */
function parseLessonFile(path: string): { code: string; title: string; questions: ParsedQuestion[] } | null {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);

  // Find the lesson header line to extract code + title.
  let code = "";
  let title = "";
  for (const line of lines) {
    const m = LESSON_HEADER_RE.exec(line);
    if (m) {
      code = m[1];
      title = m[2];
      break;
    }
  }
  if (!code) return null;

  // Collect question lines: from the first H4 to either the ☐ or EOF.
  const questionLines: string[] = [];
  let inQuestions = false;
  for (const line of lines) {
    if (!inQuestions) {
      if (QUESTIONS_HEADER_RE.test(line)) inQuestions = true;
      continue;
    }
    if (COMPLETED_RE.test(line)) break;
    questionLines.push(line);
  }

  return { code, title, questions: parseQuestions(questionLines) };
}

/** Parse just the questions in a chapter test file. The file has no lesson
 *  header — questions start at the H4 (or simply at the first numbered line). */
function parseTestFile(path: string): ParsedQuestion[] {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const questionLines: string[] = [];
  let inQuestions = false;
  for (const line of lines) {
    if (!inQuestions) {
      // H4 or first numbered question both start the section.
      if (QUESTIONS_HEADER_RE.test(line) || NUMBERED_QUESTION_RE.test(line)) {
        inQuestions = true;
        if (NUMBERED_QUESTION_RE.test(line)) {
          questionLines.push(line);
          continue;
        }
        continue;
      }
      continue;
    }
    if (COMPLETED_RE.test(line)) break;
    questionLines.push(line);
  }
  return parseQuestions(questionLines);
}

/** Pull "Chapter N: Title" entries out of outline.md so we know the
 *  chapter titles without requiring a per-chapter metadata file. */
function chapterTitlesFromOutline(outlinePath: string): Map<number, string> {
  const titles = new Map<number, string>();
  if (!existsSync(outlinePath)) return titles;
  const lines = readFileSync(outlinePath, "utf8").split(/\r?\n/);
  // Match either a markdown link "[Chapter N: Title](...)" or a plain
  // "Chapter N: Title" line — outline format varies a bit by author.
  const linkRe = /\[Chapter\s+(\d+)\s*[:\-]\s*([^\]]+)\]/i;
  const plainRe = /^[\s\-*]*Chapter\s+(\d+)\s*[:\-]\s*(.+?)\s*$/i;
  for (const line of lines) {
    const m = linkRe.exec(line) ?? plainRe.exec(line);
    if (m) {
      const n = Number(m[1]);
      if (!titles.has(n)) titles.set(n, m[2].trim());
    }
  }
  return titles;
}

function parseChapterDir(
  chapterDirPath: string,
  chapterNumber: number,
  fallbackTitle: string
): ParsedChapter {
  // Find every per-lesson file: digit-named (M.md or M.mdx) and "test".
  const entries = readdirSync(chapterDirPath);
  interface LessonFile { sortKey: number; path: string; isTest: boolean }
  const files: LessonFile[] = [];
  for (const entry of entries) {
    const full = join(chapterDirPath, entry);
    if (!statSync(full).isFile()) continue;
    const lessonM = /^(\d+)\.(mdx|md)$/.exec(entry);
    if (lessonM) {
      files.push({ sortKey: Number(lessonM[1]), path: full, isTest: false });
      continue;
    }
    const testM = /^test\.(mdx|md)$/.exec(entry);
    if (testM) {
      files.push({ sortKey: Number.MAX_SAFE_INTEGER, path: full, isTest: true });
    }
  }
  // Prefer .mdx if both .md and .mdx exist for the same lesson number.
  const dedup = new Map<number, LessonFile>();
  for (const f of files) {
    const existing = dedup.get(f.sortKey);
    if (!existing || f.path.endsWith(".mdx")) dedup.set(f.sortKey, f);
  }
  const ordered = [...dedup.values()].sort((a, b) => a.sortKey - b.sortKey);

  const lessons: ParsedLesson[] = [];
  for (const f of ordered) {
    if (f.isTest) {
      lessons.push({
        code: "test",
        title: `Chapter ${chapterNumber} Test`,
        kind: "test",
        sortOrder: lessons.length,
        questions: parseTestFile(f.path),
      });
    } else {
      const parsed = parseLessonFile(f.path);
      if (!parsed) continue;
      lessons.push({
        code: parsed.code,
        title: parsed.title,
        kind: "lesson",
        sortOrder: lessons.length,
        questions: parsed.questions,
      });
    }
  }

  return { number: chapterNumber, title: fallbackTitle, lessons };
}

function parseOutline(path: string): { title: string; subtitle: string } {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = titleLine.replace(/^#\s+/, "").trim();
  // Subtitle is the first non-empty, non-heading line after the title.
  let subtitle = "";
  let pastTitle = false;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      pastTitle = true;
      continue;
    }
    if (!pastTitle) continue;
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    subtitle = t.replace(/\s{2,}$/, "");
    break;
  }
  return { title, subtitle };
}

export function parseBook(bookDir: string, slug: string, author: string): ParsedBook {
  const enDir = join(bookDir, "en");
  const { title, subtitle } = parseOutline(join(enDir, "outline.md"));
  const meta = parseBookMeta(join(enDir, "book.json"));
  const chaptersDir = join(enDir, "chapters");
  const titles = chapterTitlesFromOutline(join(enDir, "outline.md"));

  // Each chapter is now a directory of per-lesson files. Walk every
  // numbered subdirectory; ignore any leftover loose files at this level.
  const chapterDirs: { n: number; path: string }[] = [];
  for (const entry of readdirSync(chaptersDir)) {
    const full = join(chaptersDir, entry);
    if (!statSync(full).isDirectory()) continue;
    const n = Number(entry);
    if (!Number.isInteger(n)) continue;
    chapterDirs.push({ n, path: full });
  }
  chapterDirs.sort((a, b) => a.n - b.n);

  const chapters = chapterDirs.map(({ n, path }) =>
    parseChapterDir(path, n, titles.get(n) ?? `Chapter ${n}`)
  );

  return {
    slug,
    title,
    subtitle,
    author,
    audience: meta.audience?.trim() || null,
    subjects: Array.isArray(meta.subjects)
      ? meta.subjects.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())
      : null,
    tutorInstructions: meta.tutor_instructions?.trim() || null,
    description: meta.description?.trim() || null,
    introduction: meta.introduction?.trim() || null,
    imageUrl: meta.image_url?.trim() || null,
    whatYoullLearn: Array.isArray(meta.what_youll_learn)
      ? meta.what_youll_learn.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())
      : null,
    expectations: meta.expectations?.trim() || null,
    prerequisites: meta.prerequisites?.trim() || null,
    seriesName: meta.series_name?.trim() || null,
    seriesOrder:
      typeof meta.series_order === "number" && Number.isInteger(meta.series_order) && meta.series_order > 0
        ? meta.series_order
        : null,
    priceCents:
      typeof meta.price_cents === "number" && Number.isInteger(meta.price_cents) && meta.price_cents >= 0
        ? meta.price_cents
        : null,
    freeLessonsCount:
      typeof meta.free_lessons_count === "number" && Number.isInteger(meta.free_lessons_count) && meta.free_lessons_count >= 0
        ? meta.free_lessons_count
        : 0,
    published: meta.published === false ? false : true,
    chapters,
  };
}
