import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  configuredAdminPassword,
  isValidAdminSession,
} from "@/lib/admin-session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value, configuredAdminPassword());
}
