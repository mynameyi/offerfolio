import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";
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
  token: string | null;
  linkLabel: string;
  entryPath: string;
  referrer: string;
  userAgent: string;
  acceptLanguage: string;
  isAutomated: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  modules: ShareVisitModule[];
};

export type VisitContext = {
  token: string | null;
  ipAddress: string;
  entryPath: string;
  referrer: string;
  userAgent: string;
  acceptLanguage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export type ShareVisitEngagement = {
  durationSeconds: number;
  clicks: PortfolioModuleKey[];
  dwellSeconds: Partial<Record<PortfolioModuleKey, number>>;
};

export function visitContextFromHeaders(
  requestHeaders: Headers,
  entryPath: string,
  token: string | null,
  campaign: { source?: string; medium?: string; name?: string } = {},
): VisitContext {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const real = requestHeaders.get("x-real-ip")?.trim() || "";
  const ipAddress = [real, forwarded].find((candidate) => isIP(candidate)) || "";
  const rawReferrer = requestHeaders.get("referer") || "";
  let referrer = "";
  try {
    const parsed = new URL(rawReferrer);
    referrer = `${parsed.origin}${parsed.pathname}`.slice(0, 500);
  } catch {
    referrer = "";
  }
  return {
    token,
    ipAddress,
    entryPath: entryPath.slice(0, 300),
    referrer,
    userAgent: (requestHeaders.get("user-agent") || "").slice(0, 512),
    acceptLanguage: (requestHeaders.get("accept-language") || "").slice(0, 160),
    utmSource: (campaign.source || "").slice(0, 120),
    utmMedium: (campaign.medium || "").slice(0, 120),
    utmCampaign: (campaign.name || "").slice(0, 120),
  };
}

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

export function countVisitorVisits(): number {
  return Number((db.prepare("SELECT COUNT(*) AS count FROM share_visits").get() as { count: number }).count);
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

export function getVisitorVisitKey(visitKey: string, token?: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(visitKey)) return false;
  return token
    ? Boolean(db.prepare("SELECT 1 FROM share_visits WHERE visit_key = ? AND token = ?").get(visitKey, token))
    : Boolean(db.prepare("SELECT 1 FROM share_visits WHERE visit_key = ?").get(visitKey));
}

function isAutomatedUserAgent(value: string): boolean {
  return /bot|crawler|spider|preview|headless|scanner|fetcher|facebookexternalhit|slackbot|whatsapp|telegrambot|discordbot|linkedinbot/i.test(value);
}

export function recordVisitorVisit(context: VisitContext): string | null {
  if (context.token && !getActiveShareLink(context.token)) return null;
  const visitKey = randomUUID();
  db.prepare(`
    INSERT INTO share_visits (
      token, visited_at, ip_address, visit_key, entry_path, referrer, user_agent,
      accept_language, is_automated, utm_source, utm_medium, utm_campaign
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    context.token,
    new Date().toISOString(),
    context.ipAddress.slice(0, 64),
    visitKey,
    context.entryPath,
    context.referrer,
    context.userAgent,
    context.acceptLanguage,
    isAutomatedUserAgent(context.userAgent) ? 1 : 0,
    context.utmSource || "",
    context.utmMedium || "",
    context.utmCampaign || "",
  );
  return visitKey;
}

export function recordShareVisit(token: string, ipAddress: string): string | null {
  return recordVisitorVisit({ token, ipAddress, entryPath: `/r/${token}`, referrer: "", userAgent: "", acceptLanguage: "" });
}

export function recordVisitorVisitEngagement(
  visitKey: string,
  engagement: ShareVisitEngagement,
): boolean {
  const visit = db.prepare(`
    SELECT id FROM share_visits WHERE visit_key = ?
  `).get(visitKey) as { id: number } | undefined;
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

export function recordShareVisitEngagement(token: string, visitKey: string, engagement: ShareVisitEngagement): boolean {
  if (!getShareVisitKey(token, visitKey)) return false;
  return recordVisitorVisitEngagement(visitKey, engagement);
}

export function listShareVisits(token: string, limit = 50): ShareVisit[] | null {
  if (!db.prepare("SELECT 1 FROM share_links WHERE token = ?").get(token)) return null;
  return listVisits("share_visits.token = ?", [token], limit);
}

export function listVisitorVisits(limit = 100): { total: number; visits: ShareVisit[] } {
  const total = countVisitorVisits();
  return { total, visits: listVisits("1 = 1", [], limit) };
}

function listVisits(where: string, params: unknown[], limit: number): ShareVisit[] {
  const rows = db.prepare(`
    SELECT
      recent.id AS id,
      recent.visit_key AS visitKey,
      recent.visited_at AS visitedAt,
      recent.ip_address AS ipAddress,
      recent.duration_seconds AS durationSeconds,
      recent.token AS token,
      COALESCE(share_links.label, '') AS linkLabel,
      recent.entry_path AS entryPath,
      recent.referrer AS referrer,
      recent.user_agent AS userAgent,
      recent.accept_language AS acceptLanguage,
      recent.is_automated AS isAutomated,
      recent.utm_source AS utmSource,
      recent.utm_medium AS utmMedium,
      recent.utm_campaign AS utmCampaign,
      share_visit_modules.module_key AS moduleKey,
      share_visit_modules.click_count AS clickCount,
      share_visit_modules.dwell_seconds AS dwellSeconds
    FROM (
      SELECT id, visit_key, visited_at, ip_address, duration_seconds, token,
        entry_path, referrer, user_agent, accept_language, is_automated,
        utm_source, utm_medium, utm_campaign
      FROM share_visits
      WHERE ${where}
      ORDER BY id DESC
      LIMIT ?
    ) AS recent
    LEFT JOIN share_links ON share_links.token = recent.token
    LEFT JOIN share_visit_modules ON share_visit_modules.visit_id = recent.id
    ORDER BY recent.id DESC, share_visit_modules.module_key ASC
  `).all(...params, limit) as Array<{
    id: number;
    visitKey: string;
    visitedAt: string;
    ipAddress: string;
    durationSeconds: number;
    token: string | null;
    linkLabel: string;
    entryPath: string;
    referrer: string;
    userAgent: string;
    acceptLanguage: string;
    isAutomated: number;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
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
        token: row.token,
        linkLabel: row.linkLabel,
        entryPath: row.entryPath,
        referrer: row.referrer,
        userAgent: row.userAgent,
        acceptLanguage: row.acceptLanguage,
        isAutomated: row.isAutomated === 1,
        utmSource: row.utmSource,
        utmMedium: row.utmMedium,
        utmCampaign: row.utmCampaign,
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
