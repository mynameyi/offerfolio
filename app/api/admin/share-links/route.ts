import { NextResponse } from "next/server";
import { createShareLink, listShareLinks, parseVisitorVisitView } from "@/lib/radar";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  const view = parseVisitorVisitView(new URL(request.url).searchParams.get("view"));
  return NextResponse.json(listShareLinks(view), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const label = typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).label === "string"
    ? (body as Record<string, string>).label
    : "";
  if (label.length > 120) {
    return NextResponse.json({ error: "链接备注不能超过 120 个字符。" }, { status: 400 });
  }

  return NextResponse.json(createShareLink(label), { status: 201, headers: { "Cache-Control": "no-store" } });
}
