import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { PortfolioModuleKey } from "@/lib/profile";

export type ShareLink = {
  token: string;
  label: string;
  createdAt: string;
  active: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
};

export type ShareVisitModule = {
  key: PortfolioModuleKey;
  clickCount: number;
  dwellSeconds: number;
};

export type ShareVisit = {
  visitKey: string;
  visitedAt: string;
  ipAddress: string;
  durationSeconds: number;
  modules: ShareVisitModule[];
};

export type ShareVisitEngagement = {
  durationSeconds: number;
  clicks: PortfolioModuleKey[];
  dwellSeconds: Partial<Record<PortfolioModuleKey, number>>;
};

export function listShareLinks(): ShareLink[] {
  return db.prepare(`
    SELECT
      share_links.token AS token,
      share_links.label AS label,
      share_links.created_at AS createdAt,
      share_links.active AS active,
      COUNT(share_visits.id) AS visitCount,
      MAX(share_visits.visited_at) AS lastVisitedAt
    FROM share_links
    LEFT JOIN share_visits ON share_visits.token = share_links.token
    GROUP BY share_links.token
    ORDER BY share_links.created_at DESC
  `).all().map((row) => {
    const link = row as Omit<ShareLink, "active" | "visitCount"> & { active: number; visitCount: number };
    return { ...link, active: link.active === 1, visitCount: Number(link.visitCount) };
  });
}

export function getActiveShareLink(token: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM share_links WHERE token = ? AND active = 1").get(token));
}

export function createShareLink(label: string): ShareLink {
  const token = randomBytes(12).toString("base64url");
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO share_links (token, label, created_at) VALUES (?, ?, ?)")
    .run(token, label.trim().slice(0, 120), createdAt);
  return { token, label: label.trim().slice(0, 120), createdAt, active: true, visitCount: 0, lastVisitedAt: null };
}

export function getShareVisitKey(token: string, visitKey: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM share_visits WHERE token = ? AND visit_key = ?").get(token, visitKey));
}

export function recordShareVisit(token: string, ipAddress: string): string | null {
  if (!getActiveShareLink(token)) return null;
  const visitKey = randomUUID();
  db.prepare("INSERT INTO share_visits (token, visited_at, ip_address, visit_key) VALUES (?, ?, ?, ?)")
    .run(token, new Date().toISOString(), ipAddress.slice(0, 64), visitKey);
  return visitKey;
}

export function recordShareVisitEngagement(
  token: string,
  visitKey: string,
  engagement: ShareVisitEngagement,
): boolean {
  const visit = db.prepare(`
    SELECT share_visits.id AS id
    FROM share_visits
    JOIN share_links ON share_links.token = share_visits.token
    WHERE share_visits.token = ? AND share_visits.visit_key = ? AND share_links.active = 1
  `).get(token, visitKey) as { id: number } | undefined;
  if (!visit) return false;

  const updateEngagement = db.transaction(() => {
    if (engagement.durationSeconds > 0) {
      db.prepare("UPDATE share_visits SET duration_seconds = duration_seconds + ? WHERE id = ?")
        .run(engagement.durationSeconds, visit.id);
    }
    const upsertModule = db.prepare(`
      INSERT INTO share_visit_modules (visit_id, module_key, click_count, dwell_seconds)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(visit_id, module_key) DO UPDATE SET
        click_count = share_visit_modules.click_count + excluded.click_count,
        dwell_seconds = share_visit_modules.dwell_seconds + excluded.dwell_seconds
    `);
    const clickCounts = new Map<PortfolioModuleKey, number>();
    for (const key of engagement.clicks) clickCounts.set(key, (clickCounts.get(key) ?? 0) + 1);
    for (const [key, count] of clickCounts) upsertModule.run(visit.id, key, count, 0);
    for (const [key, seconds] of Object.entries(engagement.dwellSeconds) as Array<[PortfolioModuleKey, number]>) {
      if (seconds > 0) upsertModule.run(visit.id, key, 0, seconds);
    }
  });
  updateEngagement();
  return true;
}

export function listShareVisits(token: string, limit = 50): ShareVisit[] | null {
  if (!db.prepare("SELECT 1 FROM share_links WHERE token = ?").get(token)) return null;
  const rows = db.prepare(`
    SELECT
      recent.id AS id,
      recent.visit_key AS visitKey,
      recent.visited_at AS visitedAt,
      recent.ip_address AS ipAddress,
      recent.duration_seconds AS durationSeconds,
      share_visit_modules.module_key AS moduleKey,
      share_visit_modules.click_count AS clickCount,
      share_visit_modules.dwell_seconds AS dwellSeconds
    FROM (
      SELECT id, visit_key, visited_at, ip_address, duration_seconds
      FROM share_visits
      WHERE token = ?
      ORDER BY id DESC
      LIMIT ?
    ) AS recent
    LEFT JOIN share_visit_modules ON share_visit_modules.visit_id = recent.id
    ORDER BY recent.id DESC, share_visit_modules.module_key ASC
  `).all(token, limit) as Array<{
    id: number;
    visitKey: string;
    visitedAt: string;
    ipAddress: string;
    durationSeconds: number;
    moduleKey: PortfolioModuleKey | null;
    clickCount: number | null;
    dwellSeconds: number | null;
  }>;

  const visits = new Map<number, ShareVisit>();
  for (const row of rows) {
    let visit = visits.get(row.id);
    if (!visit) {
      visit = {
        visitKey: row.visitKey,
        visitedAt: row.visitedAt,
        ipAddress: row.ipAddress,
        durationSeconds: Number(row.durationSeconds),
        modules: [],
      };
      visits.set(row.id, visit);
    }
    if (row.moduleKey) {
      visit.modules.push({
        key: row.moduleKey,
        clickCount: Number(row.clickCount ?? 0),
        dwellSeconds: Number(row.dwellSeconds ?? 0),
      });
    }
  }
  return [...visits.values()];
}

export function revokeShareLink(token: string): boolean {
  return db.prepare("UPDATE share_links SET active = 0 WHERE token = ? AND active = 1").run(token).changes > 0;
}
