import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createApplicationScript, listApplicationScripts } from "@/lib/application-scripts";

export const dynamic = "force-dynamic";

type ScriptBody = { roleTitle: string; company: string; content: string };

async function readScriptBody(request: Request): Promise<ScriptBody | null> {
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

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  return NextResponse.json(listApplicationScripts(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  const input = await readScriptBody(request);
  if (!input) return NextResponse.json({ error: "请填写岗位名称和话术；岗位 / 公司最多 160 字，话术最多 10000 字。" }, { status: 400 });
  return NextResponse.json(createApplicationScript(input), { status: 201, headers: { "Cache-Control": "no-store" } });
}
