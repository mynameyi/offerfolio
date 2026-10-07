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
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  m4v: "video/mp4",
};

function streamResponse(path: string, type: string, size: number, start: number, end: number, status: number) {
  const stream = createReadStream(path, { start, end });
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(end - start + 1),
    "Content-Type": type,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const match = filename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]+)$/i);
  const extension = match?.[2].toLowerCase();
  const type = extension ? MIME_TYPES[extension] : undefined;
  if (!match || !type) return new NextResponse(null, { status: 404 });

  const path = join(process.cwd(), "data", "uploads", "highlights", filename);
  try {
    const file = await stat(path);
    if (!file.isFile()) return new NextResponse(null, { status: 404 });

    const range = request.headers.get("range");
    if (!range) return streamResponse(path, type, file.size, 0, Math.max(file.size - 1, 0), 200);

    const rangeMatch = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!rangeMatch || file.size === 0) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    }
    const suffixLength = rangeMatch[1] ? 0 : Number(rangeMatch[2]);
    const start = rangeMatch[1] ? Number(rangeMatch[1]) : Math.max(file.size - suffixLength, 0);
    const end = rangeMatch[2] && rangeMatch[1] ? Math.min(Number(rangeMatch[2]), file.size - 1) : file.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= file.size || end < start) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    }
    return streamResponse(path, type, file.size, start, end, 206);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
