import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { revokeShareLink } from "@/lib/radar";

export async function PATCH(_request: Request, context: { params: Promise<{ token: string }> }) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  const { token } = await context.params;
  if (!revokeShareLink(token)) {
    return NextResponse.json({ error: "链接不存在或已撤销。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
