import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  adminPasswordHash,
  configuredAdminPassword,
  isValidAdminSession,
} from "@/lib/admin-session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const passwordHash = adminPasswordHash();
  const sessionSecret = passwordHash ?? configuredAdminPassword();
  const authenticated = isValidAdminSession(token, sessionSecret);
  return NextResponse.json(
    {
      authenticated,
      configured: Boolean(sessionSecret),
      mustChangePassword: authenticated && !passwordHash,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
