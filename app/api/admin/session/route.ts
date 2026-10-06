import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  configuredAdminPassword,
  isValidAdminSession,
} from "@/lib/admin-session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return NextResponse.json(
    {
      authenticated: isValidAdminSession(token, configuredAdminPassword()),
      configured: Boolean(configuredAdminPassword()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
