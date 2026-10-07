import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listVisitorVisits } from "@/lib/radar";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  return NextResponse.json(listVisitorVisits(100), { headers: { "Cache-Control": "no-store" } });
}
