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
    return NextResponse.json({ error: "请选择项目图片。" }, { status: 400 });
  }

  const media = getUploadedMediaType(file.type);
  if (!media || media.kind !== "image") {
    return NextResponse.json({ error: "支持 JPG、PNG、WebP、GIF、AVIF 图片。" }, { status: 415 });
  }

  try {
    const saved = await saveUploadedMedia(file, "projects");
    return NextResponse.json({ url: `/api/media/projects/${saved.filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "保存项目图片失败，请检查服务器磁盘空间。" }, { status: 500 });
  }
}
