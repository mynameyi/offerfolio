import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAdminPasswordHash } from "@/lib/db";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_SECONDS,
  adminPasswordHash,
  configuredAdminPassword,
  createAdminSession,
  hashAdminPassword,
  isValidAdminSession,
  passwordsMatch,
  secureCookie,
  verifyAdminPassword,
} from "@/lib/admin-session";

export async function PUT(request: Request) {
  const storedHash = adminPasswordHash();
  const bootstrapPassword = configuredAdminPassword();
  const sessionSecret = storedHash ?? bootstrapPassword;
  if (!sessionSecret) {
    return NextResponse.json({ error: "管理后台尚未启用，请先配置初始引导口令。" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token, sessionSecret)) {
    return NextResponse.json({ error: "登录状态已过期，请重新登录。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};
  const currentPassword = record.currentPassword;
  const newPassword = record.newPassword;
  const currentPasswordMatches = storedHash
    ? verifyAdminPassword(currentPassword, storedHash)
    : typeof currentPassword === "string" && Boolean(bootstrapPassword && passwordsMatch(currentPassword, bootstrapPassword));

  if (!currentPasswordMatches) {
    return NextResponse.json({ error: "当前密码不正确。" }, { status: 401 });
  }
  if (typeof newPassword !== "string" || newPassword.length < ADMIN_PASSWORD_MIN_LENGTH || newPassword.length > 256) {
    return NextResponse.json(
      { error: `新密码长度需为 ${ADMIN_PASSWORD_MIN_LENGTH} 至 256 个字符。` },
      { status: 400 },
    );
  }
  if (storedHash ? verifyAdminPassword(newPassword, storedHash) : passwordsMatch(newPassword, bootstrapPassword!)) {
    return NextResponse.json({ error: "新密码不能与当前口令相同。" }, { status: 400 });
  }

  const nextHash = hashAdminPassword(newPassword);
  writeAdminPasswordHash(nextHash);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(nextHash), {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
