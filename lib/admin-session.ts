import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "offerfolio_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60;

export function configuredAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password ? password : null;
}

export function passwordsMatch(candidate: unknown, expected: string): boolean {
  if (typeof candidate !== "string") return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createAdminSession(password: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const signature = createHmac("sha256", password).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

export function isValidAdminSession(token: string | undefined, password: string | null): boolean {
  if (!token || !password) return false;
  const [expiryText, signature] = token.split(".");
  const expiresAt = Number(expiryText);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = createHmac("sha256", password).update(expiryText).digest("hex");
  const provided = Buffer.from(signature ?? "");
  const expected = Buffer.from(expectedSignature);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function secureCookie(): boolean {
  return process.env.COOKIE_SECURE === "true";
}
