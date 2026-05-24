/**
 * Serves images, video, and other assets that live alongside lesson MDX
 * files at content/bookN/en/assets/...
 *
 * URL shape: /api/content/<bookSlug>/<path/inside/en/>
 *   /api/content/econ4kids-book1/assets/cookie-jar.png
 *   /api/content/econ4kids-book1/chapter-3/diagram.svg
 *
 * The bookSlug is mapped to bookN by querying the books table. Path
 * segments are validated against directory traversal.
 */
import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, join, sep } from "node:path";
import { db } from "@/db";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";

const CONTENT_ROOT = resolve(process.cwd(), "content");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
};

/** Resolve a public slug to the on-disk directory name under content/. */
async function resolveBookDir(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ sourceDir: books.sourceDir })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);
  return row?.sourceDir ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string; path: string[] }> }
) {
  const { bookSlug, path } = await params;

  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  // Reject any segment that tries to escape the en/ directory.
  if (path.some((seg) => seg === ".." || seg === "" || seg.includes(sep))) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }

  const bookDirName = await resolveBookDir(bookSlug);
  if (!bookDirName) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Constrain the resolved file path to live inside the en/ dir for that book.
  const enRoot = resolve(CONTENT_ROOT, bookDirName, "en");
  const filePath = resolve(enRoot, join(...path));
  if (!filePath.startsWith(enRoot + sep)) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 });
    }
    bytes = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
