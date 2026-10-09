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
    CREATE TABLE IF NOT EXISTS application_scripts (
      id TEXT PRIMARY KEY,
      role_title TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
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
      token TEXT REFERENCES share_links(token) ON DELETE SET NULL,
      link_label TEXT NOT NULL DEFAULT '',
      visited_at TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      visit_key TEXT NOT NULL DEFAULT '',
      entry_path TEXT NOT NULL DEFAULT '/',
      referrer TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      accept_language TEXT NOT NULL DEFAULT '',
      is_automated INTEGER NOT NULL DEFAULT 0,
      utm_source TEXT NOT NULL DEFAULT '',
      utm_medium TEXT NOT NULL DEFAULT '',
      utm_campaign TEXT NOT NULL DEFAULT '',
      entry_module_key TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS share_visit_modules (
      visit_id INTEGER NOT NULL REFERENCES share_visits(id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      click_count INTEGER NOT NULL DEFAULT 0,
      dwell_seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (visit_id, module_key)
    );
    CREATE INDEX IF NOT EXISTS share_visits_token_idx ON share_visits(token, visited_at);
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
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
  for (const [name, definition] of [
    ["entry_path", "TEXT NOT NULL DEFAULT '/'"],
    ["link_label", "TEXT NOT NULL DEFAULT ''"],
    ["referrer", "TEXT NOT NULL DEFAULT ''"],
    ["user_agent", "TEXT NOT NULL DEFAULT ''"],
    ["accept_language", "TEXT NOT NULL DEFAULT ''"],
    ["is_automated", "INTEGER NOT NULL DEFAULT 0"],
    ["utm_source", "TEXT NOT NULL DEFAULT ''"],
    ["utm_medium", "TEXT NOT NULL DEFAULT ''"],
    ["utm_campaign", "TEXT NOT NULL DEFAULT ''"],
    ["entry_module_key", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!visitColumns.has(name)) connection.exec(`ALTER TABLE share_visits ADD COLUMN ${name} ${definition}`);
  }
  connection.exec(`
    UPDATE share_visits
    SET link_label = COALESCE((SELECT label FROM share_links WHERE share_links.token = share_visits.token), '')
    WHERE link_label = '' AND token IS NOT NULL
  `);
  const missingVisitKeys = connection.prepare("SELECT id FROM share_visits WHERE visit_key = ''").all() as Array<{ id: number }>;
  const updateVisitKey = connection.prepare("UPDATE share_visits SET visit_key = ? WHERE id = ?");
  for (const visit of missingVisitKeys) updateVisitKey.run(randomUUID(), visit.id);

  const tokenColumn = (connection.prepare("PRAGMA table_info(share_visits)").all() as Array<{ name: string; notnull: number }>).find(({ name }) => name === "token");
  if (tokenColumn?.notnull) {
    connection.pragma("foreign_keys = OFF");
    try {
      connection.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE share_visits_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT REFERENCES share_links(token) ON DELETE SET NULL,
          link_label TEXT NOT NULL DEFAULT '',
          visited_at TEXT NOT NULL,
          ip_address TEXT NOT NULL DEFAULT '',
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          visit_key TEXT NOT NULL DEFAULT '',
          entry_path TEXT NOT NULL DEFAULT '/',
          referrer TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT '',
          accept_language TEXT NOT NULL DEFAULT '',
          is_automated INTEGER NOT NULL DEFAULT 0,
          utm_source TEXT NOT NULL DEFAULT '',
          utm_medium TEXT NOT NULL DEFAULT '',
          utm_campaign TEXT NOT NULL DEFAULT '',
          entry_module_key TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO share_visits_new (id, token, link_label, visited_at, ip_address, duration_seconds, visit_key, entry_path, referrer, user_agent, accept_language, is_automated, utm_source, utm_medium, utm_campaign, entry_module_key)
          SELECT id, token, link_label, visited_at, ip_address, duration_seconds, visit_key, entry_path, referrer, user_agent, accept_language, is_automated, utm_source, utm_medium, utm_campaign, entry_module_key FROM share_visits;
        CREATE TABLE share_visit_modules_new (
          visit_id INTEGER NOT NULL REFERENCES share_visits_new(id) ON DELETE CASCADE,
          module_key TEXT NOT NULL,
          click_count INTEGER NOT NULL DEFAULT 0,
          dwell_seconds INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (visit_id, module_key)
        );
        INSERT INTO share_visit_modules_new (visit_id, module_key, click_count, dwell_seconds)
          SELECT visit_id, module_key, click_count, dwell_seconds FROM share_visit_modules;
        DROP TABLE share_visit_modules;
        DROP TABLE share_visits;
        ALTER TABLE share_visits_new RENAME TO share_visits;
        ALTER TABLE share_visit_modules_new RENAME TO share_visit_modules;
        COMMIT;
      `);
    } catch (error) {
      connection.exec("ROLLBACK");
      throw error;
    } finally {
      connection.pragma("foreign_keys = ON");
    }
  }

  connection.exec("CREATE INDEX IF NOT EXISTS share_visits_token_idx ON share_visits(token, visited_at)");
  connection.exec("CREATE INDEX IF NOT EXISTS share_visits_visited_at_idx ON share_visits(visited_at)");
  connection.exec("CREATE UNIQUE INDEX IF NOT EXISTS share_visits_visit_key_idx ON share_visits(visit_key)");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS share_visit_actions (
      visit_id INTEGER NOT NULL REFERENCES share_visits(id) ON DELETE CASCADE,
      action_key TEXT NOT NULL,
      action_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (visit_id, action_key)
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
