import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME_EXTENSIONS: Record<string, { extension: string; kind: "image" | "video" }> = {
  "image/jpeg": { extension: ".jpg", kind: "image" },
  "image/png": { extension: ".png", kind: "image" },
  "image/webp": { extension: ".webp", kind: "image" },
  "image/gif": { extension: ".gif", kind: "image" },
  "image/avif": { extension: ".avif", kind: "image" },
  "video/mp4": { extension: ".mp4", kind: "video" },
  "video/webm": { extension: ".webm", kind: "video" },
  "video/ogg": { extension: ".ogv", kind: "video" },
  "video/quicktime": { extension: ".mov", kind: "video" },
  "video/x-m4v": { extension: ".m4v", kind: "video" },
};

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法读取上传文件。" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "请选择图片或视频文件。" }, { status: 400 });
  const media = MIME_EXTENSIONS[file.type.toLowerCase()];
  if (!media) return NextResponse.json({ error: "支持 JPG、PNG、WebP、GIF、AVIF 图片，以及 MP4、WebM、OGG、MOV 视频。" }, { status: 415 });

  const filename = `${randomUUID()}${media.extension}`;
  const directory = join(process.cwd(), "data", "uploads", "showcase");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "保存媒体文件失败，请检查本机磁盘空间。" }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/media/showcase/${filename}`, kind: media.kind }, { status: 201 });
}
