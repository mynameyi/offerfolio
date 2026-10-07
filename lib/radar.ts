import "server-only";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export type ShareLink = {
  token: string;
  label: string;
  createdAt: string;
  active: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
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

export function recordShareVisit(token: string): boolean {
  if (!getActiveShareLink(token)) return false;
  db.prepare("INSERT INTO share_visits (token, visited_at) VALUES (?, ?)")
    .run(token, new Date().toISOString());
  return true;
}

export function listShareVisits(token: string, limit = 20): string[] | null {
  if (!db.prepare("SELECT 1 FROM share_links WHERE token = ?").get(token)) return null;
  return (db.prepare("SELECT visited_at FROM share_visits WHERE token = ? ORDER BY id DESC LIMIT ?")
    .all(token, limit) as Array<{ visited_at: string }>).map((visit) => visit.visited_at);
}

export function revokeShareLink(token: string): boolean {
  return db.prepare("UPDATE share_links SET active = 0 WHERE token = ? AND active = 1").run(token).changes > 0;
}
