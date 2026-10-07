import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { readAdminPasswordHash } from "@/lib/db";

export const ADMIN_COOKIE_NAME = "offerfolio_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;
type LoginFailures = { timestamps: number[] };
type SessionGlobal = typeof globalThis & { offerfolioLoginFailures?: Map<string, LoginFailures> };
const sessionGlobal = globalThis as SessionGlobal;
const loginFailures = sessionGlobal.offerfolioLoginFailures ?? new Map<string, LoginFailures>();
sessionGlobal.offerfolioLoginFailures = loginFailures;

export function configuredAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password || /^(replace-with-|change-me$|changeme$|your-password$)/i.test(password)) return null;
  return password;
}

export function adminPasswordHash(): string | null {
  return readAdminPasswordHash();
}

export function isAdminConfigured(): boolean {
  return Boolean(adminPasswordHash() || configuredAdminPassword());
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export function verifyAdminPassword(candidate: unknown, passwordHash: string): boolean {
  if (typeof candidate !== "string" || candidate.length > 256) return false;
  const [algorithm, saltHex, keyHex] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = scryptSync(candidate, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function loginIdentity(request: Request): string {
  const forwarded = request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0];
  const address = forwarded?.trim().slice(0, 128) || "local";
  return createHash("sha256").update(address).digest("hex");
}

export function loginRetryAfter(request: Request): number {
  const record = loginFailures.get(loginIdentity(request));
  if (!record) return 0;
  const now = Date.now();
  const recent = record.timestamps.filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  record.timestamps = recent;
  if (recent.length === 0) {
    loginFailures.delete(loginIdentity(request));
    return 0;
  }
  if (recent.length < LOGIN_MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((recent[0] + LOGIN_WINDOW_MS - now) / 1000));
}

export function recordLoginFailure(request: Request): void {
  const key = loginIdentity(request);
  const now = Date.now();
  const record = loginFailures.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  record.timestamps.push(now);
  loginFailures.set(key, record);
}

export function clearLoginFailures(request: Request): void {
  loginFailures.delete(loginIdentity(request));
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
