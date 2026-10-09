import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listVisitorVisits, setVisitorRetentionDays } from "@/lib/radar";
import { VISITOR_RETENTION_OPTIONS } from "@/lib/radar-common";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  return NextResponse.json(listVisitorVisits(100), { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }
  const retentionDays = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).retentionDays
    : undefined;
  if (typeof retentionDays !== "number" || !VISITOR_RETENTION_OPTIONS.includes(retentionDays as (typeof VISITOR_RETENTION_OPTIONS)[number])) {
    return NextResponse.json({ error: "请选择有效的访问记录保留期限。" }, { status: 400 });
  }

  const result = setVisitorRetentionDays(retentionDays);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
