import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getUploadedMediaType, saveUploadedMedia } from "@/lib/media-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    return NextResponse.json({ error: "请选择图片或视频文件。" }, { status: 400 });
  }
  const media = getUploadedMediaType(file.type);
  if (!media) {
    return NextResponse.json({ error: "支持 JPG、PNG、WebP、GIF、AVIF 图片，以及 MP4、WebM、OGG、MOV 视频。" }, { status: 415 });
  }

  let saved: Awaited<ReturnType<typeof saveUploadedMedia>>;
  try {
    saved = await saveUploadedMedia(file, "highlights");
  } catch {
    return NextResponse.json({ error: media.kind === "video" ? "视频转码失败，请确认文件完整后重试。" : "保存媒体文件失败，请检查本机磁盘空间。" }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/media/highlights/${saved.filename}`, kind: saved.kind }, { status: 201 });
}
