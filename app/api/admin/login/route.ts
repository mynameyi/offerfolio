import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
  adminPasswordHash,
  clearLoginFailures,
  configuredAdminPassword,
  createAdminSession,
  loginRetryAfter,
  passwordsMatch,
  recordLoginFailure,
  secureCookie,
  verifyAdminPassword,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const retryAfter = loginRetryAfter(request);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: "登录尝试次数过多，请稍后再试。" },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const storedHash = adminPasswordHash();
  const bootstrapPassword = configuredAdminPassword();
  if (!storedHash && !bootstrapPassword) {
    return NextResponse.json(
      { error: "管理后台尚未启用，请先配置初始引导口令。" },
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
  const authenticated = storedHash
    ? verifyAdminPassword(password, storedHash)
    : Boolean(bootstrapPassword && passwordsMatch(password, bootstrapPassword));
  if (!authenticated) {
    recordLoginFailure(request);
    return NextResponse.json({ error: "密码不正确。" }, { status: 401 });
  }

  clearLoginFailures(request);
  const sessionSecret = storedHash ?? bootstrapPassword!;
  const response = NextResponse.json({ ok: true, mustChangePassword: !storedHash });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(sessionSecret), {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
