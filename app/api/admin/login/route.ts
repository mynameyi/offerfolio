import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
  configuredAdminPassword,
  createAdminSession,
  passwordsMatch,
  secureCookie,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const expectedPassword = configuredAdminPassword();
  if (!expectedPassword) {
    return NextResponse.json(
      { error: "管理后台尚未启用，请先配置 ADMIN_PASSWORD。" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).password
      : undefined;
  if (!passwordsMatch(password, expectedPassword)) {
    return NextResponse.json({ error: "密码不正确。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(expectedPassword), {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
