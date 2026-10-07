import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法读取上传文件。" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请选择头像图片。" }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type.toLowerCase()];
  if (!extension) {
    return NextResponse.json({ error: "支持 JPG、PNG、WebP、GIF、AVIF 图片。" }, { status: 415 });
  }

  const filename = `${randomUUID()}${extension}`;
  const directory = join(process.cwd(), "data", "uploads", "avatars");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "保存头像失败，请检查本机磁盘空间。" }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/media/avatars/${filename}` }, { status: 201 });
}
