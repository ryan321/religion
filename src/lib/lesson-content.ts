/**
 * Reads a single lesson's body from the in-tree content directory.
 *
 * Layout (after the per-lesson split migration):
 *   content/<sourceDir>/<locale>/chapters/<chapterNumber>/<lessonNumber>.{mdx,md}
 *   content/<sourceDir>/<locale>/chapters/<chapterNumber>/test.{mdx,md}
 *
 * The runtime never slices a multi-lesson file — it just reads the file
 * for the requested lesson directly. Falls back to English when the
 * requested locale doesn't have content for this book.
 *
 * The trailing "#### Questions" section and "☐ Completed" marker are
 * stripped from the body since the questions live in the DB and the
 * checkbox is an authoring artifact.
 */
import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTENT_ROOT = resolve(process.cwd(), "content");

export interface LessonBodySource {
  /** Body MDX with the questions/completion footer trimmed and asset paths
   *  rewritten to flow through /api/content/<bookSlug>/. */
  mdx: string;
  /** Lesson title parsed from the file's H3 header — already in the
   *  requested locale's language. Null if the H3 isn't present. */
  title: string | null;
  /** Filesystem path the content was loaded from (for debugging). */
  sourcePath: string;
}

export interface LocalizedHeader {
  /** Book title in the requested locale (from outline.md `# Title`). */
  bookTitle: string | null;
  /** chapterNumber → chapter title in the requested locale. */
  chapterTitles: Map<number, string>;
}

/** All overridable book metadata fields for a given locale. Each field is
 *  null if no localized value exists; callers should ?? against the DB
 *  (English) value. Sourced from `<locale>/book.json` and `<locale>/outline.md`,
 *  with a graceful fall-through to en/ if the locale-specific files are
 *  missing or partial. */
export interface LocalizedBook {
  bookTitle: string | null;
  description: string | null;
  introduction: string | null;
  audience: string | null;
  expectations: string | null;
  prerequisites: string | null;
  whatYoullLearn: string[] | null;
  subjects: string[] | null;
  chapterTitles: Map<number, string>;
}

/** Same shape as the BookMeta in src/seed/parse-book.ts. Duplicated here
 *  so this lib doesn't pull in seed-time imports. */
interface BookJson {
  title?: string;
  audience?: string;
  subjects?: string[];
  description?: string;
  introduction?: string;
  expectations?: string;
  prerequisites?: string;
  what_youll_learn?: string[];
}

// Strip the question footer (everything from the first H4 or the ☐ line).
const FOOTER_RE = /(?:^####\s|^☐\s)/m;

// Locale-agnostic — match the H3 lesson header (any prefix word + N.M code +
// separator + title). Same regex as the seed parser. Separator class
// covers ASCII dash/colon, en/em dash, and CJK fullwidth colon (：).
const LESSON_HEADER_RE = /^###\s+.*?(\d+\.\d+).*?[—–\-:：]\s*(.+?)\s*$/;
const QUESTIONS_HEADER_RE = /^####\s+/;
const NUMBERED_QUESTION_RE = /^\s*(\d+)\.\s+(.+?)\s*$/;
const BLANK_FILLER_RE = /^\s*_+\s*$/;
const COMPLETED_RE = /^☐\s/;

/** Strip the lesson body down to just the narrative — drops the questions
 *  section and any "☐ Completed Lesson" marker. */
function trimBody(content: string): string {
  const m = content.match(FOOTER_RE);
  if (m && m.index !== undefined) {
    return content.slice(0, m.index).trimEnd();
  }
  return content.trim();
}

/** Rewrite relative asset references to flow through /api/content/<bookSlug>/.
 *  Handles both:
 *    Markdown:  ![alt](./assets/foo.png)   ![alt](assets/foo.png)
 *    JSX props: src="./assets/foo.png"     src="assets/foo.png"
 *  Absolute URLs and "/already/absolute/paths" are left alone. */
function rewriteAssetPaths(mdx: string, bookSlug: string): string {
  const prefix = `/api/content/${bookSlug}/`;

  mdx = mdx.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (full, alt: string, path: string) => {
      const trimmed = path.trim();
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("data:")
      ) {
        return full;
      }
      const cleaned = trimmed.replace(/^\.\//, "");
      return `![${alt}](${prefix}${cleaned})`;
    }
  );

  mdx = mdx.replace(/(\bsrc\s*=\s*")([^"]+)(")/g, (full, before: string, path: string, after: string) => {
    const trimmed = path.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("data:")
    ) {
      return full;
    }
    const cleaned = trimmed.replace(/^\.\//, "");
    return `${before}${prefix}${cleaned}${after}`;
  });

  return mdx;
}

/** Read the per-lesson file in `<locale>/chapters/<chapterNumber>/<file>`.
 *  Tries .mdx first, then .md. Returns null if neither exists. */
async function tryReadLesson(
  sourceDir: string,
  locale: string,
  chapterNumber: number,
  fileBase: string
): Promise<{ content: string; path: string } | null> {
  for (const ext of ["mdx", "md"]) {
    const path = resolve(
      CONTENT_ROOT,
      sourceDir,
      locale,
      "chapters",
      String(chapterNumber),
      `${fileBase}.${ext}`
    );
    try {
      const content = await readFile(path, "utf8");
      return { content, path };
    } catch {
      // try next ext
    }
  }
  return null;
}

/** Load the body MDX for a single lesson in the requested locale, falling
 *  back to English when the locale isn't available for this book.
 *  Returns null if the file isn't found in either locale (caller should 404). */
export async function loadLessonBody(args: {
  /** Public URL slug — only used for rewriting relative asset paths. */
  bookSlug: string;
  /** On-disk directory name under content/ (books.source_dir). */
  sourceDir: string;
  /** ISO locale (e.g. "es"); if no file exists in this locale we fall back to en. */
  locale: string;
  chapterNumber: number;
  lessonCode: string;
}): Promise<LessonBodySource | null> {
  // For "test" the file is "test"; for a regular lesson code "1.2" the file
  // is "2" inside the chapter-1 directory.
  const fileBase =
    args.lessonCode === "test"
      ? "test"
      : args.lessonCode.split(".")[1] ?? args.lessonCode;

  const localized =
    args.locale !== "en"
      ? await tryReadLesson(args.sourceDir, args.locale, args.chapterNumber, fileBase)
      : null;
  const file =
    localized ??
    (await tryReadLesson(args.sourceDir, "en", args.chapterNumber, fileBase));
  if (!file) return null;

  // Pull the H3 lesson title out of the file before we strip the body.
  let title: string | null = null;
  for (const line of file.content.split(/\r?\n/)) {
    const m = LESSON_HEADER_RE.exec(line);
    if (m) {
      title = m[2];
      break;
    }
  }

  const trimmed = trimBody(file.content);
  const mdx = rewriteAssetPaths(trimmed, args.bookSlug);
  return { mdx, title, sourcePath: file.path };
}

/** Try reading a file at content/<sourceDir>/<locale>/<...rel>; null if
 *  it doesn't exist. */
async function tryReadFile(
  sourceDir: string,
  locale: string,
  ...rel: string[]
): Promise<string | null> {
  const path = resolve(CONTENT_ROOT, sourceDir, locale, ...rel);
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/** Parse outline.md for the H1 book title and chapter titles. The chapter-
 *  matching regex is locale-agnostic (any prefix word + number + separator). */
function parseOutline(text: string): {
  bookTitle: string | null;
  chapterTitles: Map<number, string>;
} {
  const result = {
    bookTitle: null as string | null,
    chapterTitles: new Map<number, string>(),
  };
  for (const line of text.split(/\r?\n/)) {
    const h1 = /^#\s+(.+?)\s*$/.exec(line);
    if (h1 && !result.bookTitle) {
      result.bookTitle = h1[1];
      continue;
    }
    // Separator class: ASCII dash/colon, en/em dash, plus the fullwidth
    // colon (：, U+FF1A) and ideographic comma used in CJK outlines.
    const linkM = /\[(?:[^\]]*?)(\d+)[^\]]*?[—–\-:：、]\s*([^\]]+)\]/.exec(line);
    const headM = /^##\s+(?:[^0-9]*?)(\d+)[^0-9]*?[—–\-:：、]\s*(.+?)\s*$/.exec(line);
    const m = linkM ?? headM;
    if (m) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && !result.chapterTitles.has(n)) {
        result.chapterTitles.set(n, m[2].trim());
      }
    }
  }
  return result;
}

/** Best-effort JSON parse; returns null on any error. */
function tryParseBookJson(raw: string | null): BookJson | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as BookJson) : null;
  } catch {
    return null;
  }
}

/** Read all localized metadata for a book in the requested locale, falling
 *  back to en/ for any file or field that doesn't exist. The returned
 *  object always has all fields defined (null if no value found). Caller
 *  uses `?? englishValue` to apply the overlay. */
export async function loadLocalizedBook(args: {
  sourceDir: string;
  locale: string;
}): Promise<LocalizedBook> {
  // Read 4 files in parallel: locale outline, locale book.json, en outline,
  // en book.json. Per-locale wins for any field that's present there.
  const isLocalized = args.locale !== "en";
  const [localeOutline, localeJsonRaw, enOutline, enJsonRaw] = await Promise.all([
    isLocalized ? tryReadFile(args.sourceDir, args.locale, "outline.md") : Promise.resolve(null),
    isLocalized ? tryReadFile(args.sourceDir, args.locale, "book.json") : Promise.resolve(null),
    tryReadFile(args.sourceDir, "en", "outline.md"),
    tryReadFile(args.sourceDir, "en", "book.json"),
  ]);

  const localeOutlineParsed = localeOutline ? parseOutline(localeOutline) : null;
  const enOutlineParsed = enOutline ? parseOutline(enOutline) : null;
  const localeJson = tryParseBookJson(localeJsonRaw);
  const enJson = tryParseBookJson(enJsonRaw);

  // Field-by-field overlay. Empty/whitespace strings count as "no value".
  const pickStr = (...candidates: (string | undefined | null)[]): string | null => {
    for (const c of candidates) if (c && c.trim()) return c.trim();
    return null;
  };
  const pickArr = (...candidates: (string[] | undefined | null)[]): string[] | null => {
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) {
        const cleaned = c
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim());
        if (cleaned.length > 0) return cleaned;
      }
    }
    return null;
  };

  const chapterTitles = new Map<number, string>();
  // Prefer locale outline; backfill from en outline for any chapter the
  // locale didn't translate.
  if (localeOutlineParsed) {
    for (const [n, t] of localeOutlineParsed.chapterTitles) chapterTitles.set(n, t);
  }
  if (enOutlineParsed) {
    for (const [n, t] of enOutlineParsed.chapterTitles) {
      if (!chapterTitles.has(n)) chapterTitles.set(n, t);
    }
  }

  return {
    bookTitle: pickStr(
      localeJson?.title,
      localeOutlineParsed?.bookTitle,
      enJson?.title,
      enOutlineParsed?.bookTitle
    ),
    description: pickStr(localeJson?.description, enJson?.description),
    introduction: pickStr(localeJson?.introduction, enJson?.introduction),
    audience: pickStr(localeJson?.audience, enJson?.audience),
    expectations: pickStr(localeJson?.expectations, enJson?.expectations),
    prerequisites: pickStr(localeJson?.prerequisites, enJson?.prerequisites),
    whatYoullLearn: pickArr(localeJson?.what_youll_learn, enJson?.what_youll_learn),
    subjects: pickArr(localeJson?.subjects, enJson?.subjects),
    chapterTitles,
  };
}

/** Backwards-compat shim — older call sites only need bookTitle + chapter
 *  titles. New code should use loadLocalizedBook directly. */
export async function loadLocalizedHeader(args: {
  sourceDir: string;
  locale: string;
}): Promise<LocalizedHeader> {
  const full = await loadLocalizedBook(args);
  return { bookTitle: full.bookTitle, chapterTitles: full.chapterTitles };
}

/** Read the H3 lesson title from the per-lesson file in the requested
 *  locale (with en fallback). Used to localize lesson titles in lists.
 *  Returns null if the file is missing in both locales. */
async function readLessonTitle(
  sourceDir: string,
  locale: string,
  chapterNumber: number,
  lessonCode: string
): Promise<string | null> {
  const fileBase =
    lessonCode === "test" ? "test" : lessonCode.split(".")[1] ?? lessonCode;
  // Try locale, then en.
  const candidates =
    locale !== "en" ? [locale, "en"] : ["en"];
  for (const loc of candidates) {
    for (const ext of ["mdx", "md"]) {
      const path = resolve(
        CONTENT_ROOT,
        sourceDir,
        loc,
        "chapters",
        String(chapterNumber),
        `${fileBase}.${ext}`
      );
      try {
        const text = await readFile(path, "utf8");
        for (const line of text.split(/\r?\n/)) {
          const m = LESSON_HEADER_RE.exec(line);
          if (m) return m[2];
          // Tests don't have a Lesson header — no title to extract.
          // Stop searching after the first heading line.
          if (line.startsWith("#")) break;
        }
        return null;
      } catch {
        // try next ext / locale
      }
    }
  }
  return null;
}

/** Batch-read lesson titles for many lessons in parallel and return a
 *  Map keyed by lesson code. Used by /books/[slug] and /library/[bookSlug]
 *  to localize the contents list. */
export async function loadLocalizedLessonTitles(args: {
  sourceDir: string;
  locale: string;
  lessons: { chapterNumber: number; code: string }[];
}): Promise<Map<string, string>> {
  // Test files don't carry a useful title; skip them.
  const targets = args.lessons.filter((l) => l.code !== "test");
  const titles = await Promise.all(
    targets.map((l) =>
      readLessonTitle(args.sourceDir, args.locale, l.chapterNumber, l.code)
    )
  );
  const out = new Map<string, string>();
  targets.forEach((l, i) => {
    const t = titles[i];
    if (t) out.set(l.code, t);
  });
  return out;
}

/** Parse the numbered question prompts out of a lesson file's questions
 *  section (the part after the H4 header). Multiline prompts get joined
 *  with a single space. Returns an empty array if no questions found. */
function parseQuestionPrompts(text: string): string[] {
  const questions: string[] = [];
  let current: string[] | null = null;
  let inQuestions = false;

  const flush = () => {
    if (current && current.length) {
      const prompt = current.join(" ").replace(/\s+/g, " ").trim();
      if (prompt) questions.push(prompt);
    }
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    if (!inQuestions) {
      // Either an H4 header or — for test files — the first numbered line
      // signals the start of the questions block.
      if (QUESTIONS_HEADER_RE.test(line)) {
        inQuestions = true;
        continue;
      }
      if (NUMBERED_QUESTION_RE.test(line)) {
        inQuestions = true;
        // fall through to handle this line
      } else continue;
    }
    if (COMPLETED_RE.test(line)) break;
    if (BLANK_FILLER_RE.test(line)) continue;
    const m = NUMBERED_QUESTION_RE.exec(line);
    if (m) {
      flush();
      current = [m[2]];
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed) current.push(trimmed);
    }
  }
  flush();
  return questions;
}

/** Read the localized question prompts for a lesson in order. Returns null
 *  if the file is missing in both the requested locale and en. The result
 *  array is positionally aligned with the seed-time questions in the DB
 *  (same order); the page overlays by index. */
export async function loadLocalizedQuestions(args: {
  sourceDir: string;
  locale: string;
  chapterNumber: number;
  lessonCode: string;
}): Promise<string[] | null> {
  const fileBase =
    args.lessonCode === "test"
      ? "test"
      : args.lessonCode.split(".")[1] ?? args.lessonCode;
  const candidates = args.locale !== "en" ? [args.locale, "en"] : ["en"];
  for (const loc of candidates) {
    for (const ext of ["mdx", "md"]) {
      const path = resolve(
        CONTENT_ROOT,
        args.sourceDir,
        loc,
        "chapters",
        String(args.chapterNumber),
        `${fileBase}.${ext}`
      );
      try {
        const text = await readFile(path, "utf8");
        return parseQuestionPrompts(text);
      } catch {
        // try next ext / locale
      }
    }
  }
  return null;
}
