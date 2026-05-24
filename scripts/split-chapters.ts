/**
 * One-shot migration: split every chapters/N.{md,mdx} file into
 * chapters/N/M.{md,mdx} (one file per lesson) plus chapters/N/test.md
 * for the chapter test. After this runs, the runtime can read a single
 * lesson by direct filesystem path — no regex slicing required.
 *
 * Locale-agnostic: matches "### <words> N.M <sep> <title>" regardless of
 * language. Works on en, fr, es, zh-CN, ja, ar, etc. simultaneously.
 *
 * Idempotent: if chapters/N/ already exists, the corresponding chapters/N.md
 * is deleted (or skipped if no source file).
 *
 * Usage:
 *   npx tsx scripts/split-chapters.ts            # dry run, prints plan
 *   npx tsx scripts/split-chapters.ts --apply    # actually rewrite files
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";

const CONTENT_ROOT = resolve(__dirname, "..", "content");
const APPLY = process.argv.includes("--apply");

// Same patterns as src/lib/lesson-content.ts — must stay locale-agnostic.
const LESSON_HEADER_RE = /^###\s+.*?(\d+\.\d+).*?[—–\-:]\s*(.+?)\s*$/;
const H2_HEADER_RE = /^##\s+/;

interface SplitPlan {
  source: string;
  outputs: { path: string; content: string }[];
}

/** Split one chapter file into per-lesson chunks + chapter test. */
function splitChapterFile(filePath: string, chapterDir: string): SplitPlan {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const ext = filePath.endsWith(".mdx") ? "mdx" : "md";

  // Find every lesson header position + its code.
  interface LessonStart {
    line: number;
    code: string;       // "1.2"
    lessonNumber: string; // "2"
  }
  const lessons: LessonStart[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = LESSON_HEADER_RE.exec(lines[i]);
    if (m) {
      const code = m[1]; // "1.2"
      const parts = code.split(".");
      lessons.push({ line: i, code, lessonNumber: parts[1] });
    }
  }

  // Find the chapter test start: the H2 that comes AFTER all lesson headers.
  // (The H2 above the lessons is the "Lesson plan"-style wrapper, ignored.)
  let testStart = -1;
  if (lessons.length > 0) {
    const lastLessonLine = lessons[lessons.length - 1].line;
    for (let i = lastLessonLine + 1; i < lines.length; i++) {
      if (H2_HEADER_RE.test(lines[i])) {
        testStart = i;
        break;
      }
    }
  }

  const outputs: SplitPlan["outputs"] = [];

  // Each lesson body = from its header line to the next lesson, the test,
  // or end of file (whichever comes first).
  for (let i = 0; i < lessons.length; i++) {
    const start = lessons[i].line;
    let end = lines.length;
    if (i + 1 < lessons.length) end = lessons[i + 1].line;
    else if (testStart !== -1) end = testStart;
    const body = lines.slice(start, end).join("\n").replace(/\s+$/, "") + "\n";
    outputs.push({
      path: join(chapterDir, `${lessons[i].lessonNumber}.${ext}`),
      content: body,
    });
  }

  // Chapter test, if present.
  if (testStart !== -1) {
    const body = lines.slice(testStart).join("\n").replace(/\s+$/, "") + "\n";
    outputs.push({
      path: join(chapterDir, `test.${ext}`),
      content: body,
    });
  }

  return { source: filePath, outputs };
}

function processBookLocale(bookDir: string, locale: string): SplitPlan[] {
  const chaptersDir = join(bookDir, locale, "chapters");
  if (!existsSync(chaptersDir)) return [];
  const plans: SplitPlan[] = [];
  for (const entry of readdirSync(chaptersDir)) {
    const full = join(chaptersDir, entry);
    // Match "N.md" or "N.mdx" (a chapter file, not a directory).
    const m = /^(\d+)\.(mdx?)$/.exec(entry);
    if (!m) continue;
    if (!statSync(full).isFile()) continue;
    const chapterNum = m[1];
    const chapterDir = join(chaptersDir, chapterNum);
    plans.push(splitChapterFile(full, chapterDir));
  }
  return plans;
}

function listLocales(bookDir: string): string[] {
  return readdirSync(bookDir).filter((name) => {
    const full = join(bookDir, name);
    return statSync(full).isDirectory() && existsSync(join(full, "chapters"));
  });
}

function listBookDirs(): string[] {
  return readdirSync(CONTENT_ROOT)
    .map((name) => join(CONTENT_ROOT, name))
    .filter((p) => statSync(p).isDirectory());
}

function main() {
  const allPlans: SplitPlan[] = [];
  for (const bookDir of listBookDirs()) {
    for (const locale of listLocales(bookDir)) {
      allPlans.push(...processBookLocale(bookDir, locale));
    }
  }

  let totalLessons = 0;
  let totalTests = 0;
  let chapterFilesSplit = 0;
  for (const plan of allPlans) {
    chapterFilesSplit++;
    for (const out of plan.outputs) {
      if (out.path.includes("/test.")) totalTests++;
      else totalLessons++;
    }
  }

  console.log(`Discovered ${allPlans.length} chapter files to split.`);
  console.log(`  → ${totalLessons} lesson files + ${totalTests} test files`);
  console.log(`  Mode: ${APPLY ? "APPLY" : "DRY RUN (pass --apply to write)"}`);

  if (!APPLY) {
    // Sample a few outputs so a human can sanity-check.
    for (const plan of allPlans.slice(0, 3)) {
      console.log(`\n${plan.source} →`);
      for (const out of plan.outputs.slice(0, 3)) {
        const head = out.content.split("\n")[0];
        console.log(`  ${out.path.replace(CONTENT_ROOT, "content")}  [${head.slice(0, 60)}]`);
      }
      if (plan.outputs.length > 3) {
        console.log(`  ... and ${plan.outputs.length - 3} more`);
      }
    }
    return;
  }

  for (const plan of allPlans) {
    if (plan.outputs.length === 0) {
      console.warn(`  skip (no lessons found): ${plan.source}`);
      continue;
    }
    const dir = plan.outputs[0].path.split("/").slice(0, -1).join("/");
    mkdirSync(dir, { recursive: true });
    for (const out of plan.outputs) {
      writeFileSync(out.path, out.content, "utf8");
    }
    unlinkSync(plan.source);
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  console.log(`Done. Split ${chapterFilesSplit} chapter files into ${totalLessons + totalTests} per-lesson files.`);
}

main();
