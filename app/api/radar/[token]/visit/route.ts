import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secureCookie } from "@/lib/admin-session";
import { recordShareVisit } from "@/lib/radar";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(token)) {
    return NextResponse.json({ error: "链接无效。" }, { status: 404 });
  }

  const cookieName = `offerfolio_seen_${token}`;
  const cookieStore = await cookies();
  if (cookieStore.has(cookieName)) return NextResponse.json({ recorded: false });
  if (!recordShareVisit(token)) return NextResponse.json({ error: "链接不存在或已撤销。" }, { status: 404 });

  const response = NextResponse.json({ recorded: true });
  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  return response;
}
