import { NextResponse } from "next/server";
import { PROFILE_MODULES, type PortfolioModuleKey } from "@/lib/profile";
import { recordShareVisitEngagement } from "@/lib/radar";

export const dynamic = "force-dynamic";

const moduleKeys = new Set<string>(PROFILE_MODULES.map(({ key }) => key));
const isModuleKey = (value: unknown): value is PortfolioModuleKey => typeof value === "string" && moduleKeys.has(value);
const boundedSeconds = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 60;

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(token)) {
    return NextResponse.json({ error: "链接无效。" }, { status: 404 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 16_384) {
    return NextResponse.json({ error: "记录内容过大。" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const visitKey = typeof input.visitKey === "string" ? input.visitKey : "";
  if (!/^[0-9a-f-]{36}$/i.test(visitKey)) {
    return NextResponse.json({ error: "访问记录无效。" }, { status: 400 });
  }
  if (!boundedSeconds(input.durationSeconds)) {
    return NextResponse.json({ error: "停留时间数据无效。" }, { status: 400 });
  }

  const clicks = Array.isArray(input.clicks)
    ? input.clicks.slice(0, 64).filter(isModuleKey)
    : [];
  const dwellSeconds: Partial<Record<PortfolioModuleKey, number>> = {};
  if (typeof input.dwellSeconds === "object" && input.dwellSeconds !== null && !Array.isArray(input.dwellSeconds)) {
    for (const [key, value] of Object.entries(input.dwellSeconds as Record<string, unknown>)) {
      if (isModuleKey(key) && boundedSeconds(value)) dwellSeconds[key] = value;
    }
  }

  const recorded = recordShareVisitEngagement(token, visitKey, {
    durationSeconds: input.durationSeconds,
    clicks,
    dwellSeconds,
  });
  if (!recorded) return NextResponse.json({ error: "访问记录不存在或链接已停用。" }, { status: 404 });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
