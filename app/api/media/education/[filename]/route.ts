import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const match = filename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]+)$/i);
  const extension = match?.[2].toLowerCase();
  const type = extension ? MIME_TYPES[extension] : undefined;
  if (!match || !type) return new NextResponse(null, { status: 404 });

  const path = join(process.cwd(), "data", "uploads", "education", filename);
  try {
    const file = await stat(path);
    if (!file.isFile()) return new NextResponse(null, { status: 404 });
    return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(file.size),
        "Content-Type": type,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
