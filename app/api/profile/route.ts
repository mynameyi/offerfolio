import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  configuredAdminPassword,
  isValidAdminSession,
} from "@/lib/admin-session";
import { readProfile, writeProfile } from "@/lib/db";
import { normalizeProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readProfile(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token, configuredAdminPassword())) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const profile = writeProfile(normalizeProfile(body));
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "no-store" },
  });
}
