import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secureCookie } from "@/lib/admin-session";
import { clientIpFromHeaders, getActiveShareLink, getShareVisitKey, recordShareVisit } from "@/lib/radar";

function setVisitCookie(response: NextResponse, token: string, visitKey: string) {
  response.cookies.set(`offerfolio_seen_${token}`, visitKey, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(token)) {
    return NextResponse.json({ error: "链接无效。" }, { status: 404 });
  }
  if (!getActiveShareLink(token)) {
    return NextResponse.json({ error: "链接不存在或已撤销。" }, { status: 404 });
  }

  const cookieName = `offerfolio_seen_${token}`;
  const cookieStore = await cookies();
  const previousVisitKey = cookieStore.get(cookieName)?.value;
  if (previousVisitKey && getShareVisitKey(token, previousVisitKey)) {
    const response = NextResponse.json({ recorded: false, visitKey: previousVisitKey });
    setVisitCookie(response, token, previousVisitKey);
    return response;
  }
  const visitKey = recordShareVisit(token, clientIpFromHeaders(request.headers));
  if (!visitKey) return NextResponse.json({ error: "链接不存在或已撤销。" }, { status: 404 });

  const response = NextResponse.json({ recorded: true, visitKey });
  setVisitCookie(response, token, visitKey);
  return response;
}
