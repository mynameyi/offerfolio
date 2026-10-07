import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_PROFILE, normalizeProfile, type PortfolioProfile } from "@/lib/profile";

type CachedDatabase = InstanceType<typeof Database>;
type DatabaseGlobal = typeof globalThis & { offerfolioDatabase?: CachedDatabase };

function databaseFile(): string {
  const configuredPath = process.env.DATABASE_PATH || "./data/offerfolio.sqlite";
  if (configuredPath === ":memory:") return configuredPath;
  const file = configuredPath.startsWith("/")
    ? configuredPath
    : join(process.cwd(), "data", "offerfolio.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  return file;
}

function openDatabase(): CachedDatabase {
  const connection = new Database(databaseFile());
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_credential (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  connection
    .prepare(
      "INSERT OR IGNORE INTO portfolio_profile (id, profile_json, updated_at) VALUES (1, ?, ?)",
    )
    .run(JSON.stringify(DEFAULT_PROFILE), new Date().toISOString());
  return connection;
}

const databaseGlobal = globalThis as DatabaseGlobal;
export const db = databaseGlobal.offerfolioDatabase ?? openDatabase();
databaseGlobal.offerfolioDatabase = db;

export function readProfile(): PortfolioProfile {
  const row = db
    .prepare("SELECT profile_json FROM portfolio_profile WHERE id = 1")
    .get() as { profile_json: string } | undefined;
  if (!row) return DEFAULT_PROFILE;
  try {
    return normalizeProfile(JSON.parse(row.profile_json));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeProfile(profile: PortfolioProfile): PortfolioProfile {
  const normalized = normalizeProfile(profile);
  db.prepare(
    `INSERT INTO portfolio_profile (id, profile_json, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       profile_json = excluded.profile_json,
       updated_at = excluded.updated_at`,
  ).run(JSON.stringify(normalized), new Date().toISOString());
  return normalized;
}

export function readAdminPasswordHash(): string | null {
  const row = db
    .prepare("SELECT password_hash FROM admin_credential WHERE id = 1")
    .get() as { password_hash: string } | undefined;
  return row?.password_hash || null;
}

export function writeAdminPasswordHash(passwordHash: string): void {
  db.prepare(
    `INSERT INTO admin_credential (id, password_hash, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       password_hash = excluded.password_hash,
       updated_at = excluded.updated_at`,
  ).run(passwordHash, new Date().toISOString());
}
