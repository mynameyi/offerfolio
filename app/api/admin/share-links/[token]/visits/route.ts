import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listShareVisits, parseVisitorVisitView } from "@/lib/radar";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  const { token } = await context.params;
  const view = parseVisitorVisitView(new URL(request.url).searchParams.get("view"));
  const visits = listShareVisits(token, 50, view);
  if (visits === null) return NextResponse.json({ error: "链接不存在。" }, { status: 404 });
  return NextResponse.json(visits, { headers: { "Cache-Control": "no-store" } });
}
