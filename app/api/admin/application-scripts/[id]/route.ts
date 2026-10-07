import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteApplicationScript, updateApplicationScript, type ApplicationScriptInput } from "@/lib/application-scripts";

async function readScriptBody(request: Request): Promise<ApplicationScriptInput | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.roleTitle !== "string" || typeof input.company !== "string" || typeof input.content !== "string") return null;
  const result = { roleTitle: input.roleTitle.trim(), company: input.company.trim(), content: input.content.trim() };
  if (!result.roleTitle || !result.content || result.roleTitle.length > 160 || result.company.length > 160 || result.content.length > 10_000) return null;
  return result;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "话术记录不存在。" }, { status: 404 });
  const input = await readScriptBody(request);
  if (!input) return NextResponse.json({ error: "请填写岗位名称和话术；岗位 / 公司最多 160 字，话术最多 10000 字。" }, { status: 400 });
  if (!updateApplicationScript(id, input)) return NextResponse.json({ error: "话术记录不存在。" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "话术记录不存在。" }, { status: 404 });
  if (!deleteApplicationScript(id)) return NextResponse.json({ error: "话术记录不存在。" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
