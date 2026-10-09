import { NextResponse } from "next/server";
import { PROFILE_MODULES, type PortfolioModuleKey } from "@/lib/profile";
import { recordVisitorVisitEngagement, type VisitorActionKey } from "@/lib/radar";

export const dynamic = "force-dynamic";

const moduleKeys = new Set<string>(PROFILE_MODULES.map(({ key }) => key));
const actionKeys = new Set<VisitorActionKey>(["contact", "resume", "github", "gitee"]);
const isModuleKey = (value: unknown): value is PortfolioModuleKey => typeof value === "string" && moduleKeys.has(value);
const boundedSeconds = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 60;

export async function POST(request: Request) {
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
  const entryModuleKey = isModuleKey(input.entryModuleKey) ? input.entryModuleKey : undefined;
  const actions = Array.isArray(input.actions)
    ? input.actions.slice(0, 32).filter((value): value is VisitorActionKey => typeof value === "string" && actionKeys.has(value as VisitorActionKey))
    : [];

  const recorded = recordVisitorVisitEngagement(visitKey, {
    durationSeconds: input.durationSeconds,
    clicks,
    dwellSeconds,
    entryModuleKey,
    actions,
  });
  if (!recorded) return NextResponse.json({ error: "访问记录不存在。" }, { status: 404 });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
