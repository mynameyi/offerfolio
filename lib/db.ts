import "server-only";

import { randomUUID } from "node:crypto";
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
    CREATE TABLE IF NOT EXISTS share_links (
      token TEXT PRIMARY KEY,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS share_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL REFERENCES share_links(token) ON DELETE CASCADE,
      visited_at TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      visit_key TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS share_visit_modules (
      visit_id INTEGER NOT NULL REFERENCES share_visits(id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      click_count INTEGER NOT NULL DEFAULT 0,
      dwell_seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (visit_id, module_key)
    );
    CREATE INDEX IF NOT EXISTS share_visits_token_idx ON share_visits(token, visited_at);
  `);

  const visitColumns = new Set(
    (connection.prepare("PRAGMA table_info(share_visits)").all() as Array<{ name: string }>).map(({ name }) => name),
  );
  if (!visitColumns.has("ip_address")) {
    connection.exec("ALTER TABLE share_visits ADD COLUMN ip_address TEXT NOT NULL DEFAULT ''");
  }
  if (!visitColumns.has("duration_seconds")) {
    connection.exec("ALTER TABLE share_visits ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0");
  }
  if (!visitColumns.has("visit_key")) {
    connection.exec("ALTER TABLE share_visits ADD COLUMN visit_key TEXT NOT NULL DEFAULT ''");
  }
  const missingVisitKeys = connection.prepare("SELECT id FROM share_visits WHERE visit_key = ''").all() as Array<{ id: number }>;
  const updateVisitKey = connection.prepare("UPDATE share_visits SET visit_key = ? WHERE id = ?");
  for (const visit of missingVisitKeys) updateVisitKey.run(randomUUID(), visit.id);
  connection.exec("CREATE UNIQUE INDEX IF NOT EXISTS share_visits_visit_key_idx ON share_visits(visit_key)");

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
