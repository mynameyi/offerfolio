import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { isPublicIpAddress, scheduleIpGeolocationLookup } from "@/lib/ip-geolocation";
import type { PortfolioModuleKey } from "@/lib/profile";
import { visitorSource, VISITOR_RETENTION_OPTIONS } from "@/lib/radar-common";

export type VisitorActionKey = "contact" | "resume" | "github" | "gitee";

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

export type ShareVisitAction = { key: VisitorActionKey; count: number };

export type ShareVisit = {
  visitKey: string;
  visitedAt: string;
  ipAddress: string;
  ipLocation: string;
  ipLocationStatus: "resolved" | "pending" | "failed" | "private" | "unqueried" | "unavailable";
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
  entryModuleKey: PortfolioModuleKey | "";
  modules: ShareVisitModule[];
  actions: ShareVisitAction[];
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
  entryModuleKey?: PortfolioModuleKey;
  actions?: VisitorActionKey[];
};

export type VisitorSourceCount = { category: string; label: string; count: number };
export type VisitorVisitView = "active" | "ignored" | "all";
export type IgnoredVisitorIp = {
  ipAddress: string;
  createdAt: string;
  visitCount: number;
  lastVisitedAt: string | null;
};

export function parseVisitorVisitView(value: string | null): VisitorVisitView {
  if (value === "ignored" || value === "all") return value;
  return "active";
}

function normalizeVisitorIp(value: string): string {
  const candidate = value.trim().toLowerCase();
  const version = isIP(candidate);
  if (version === 4) return candidate;
  if (version === 6) return new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
  return "";
}

export function clientIpFromHeaders(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",").map((value) => value.trim()) ?? [];
  const real = requestHeaders.get("x-real-ip")?.trim() || "";
  for (const candidate of [...forwarded, real]) {
    const normalized = normalizeVisitorIp(candidate);
    if (normalized) return normalized;
  }
  return "";
}

function visitorViewWhere(view: VisitorVisitView): string {
  const isIgnored = "EXISTS (SELECT 1 FROM ignored_visitor_ips WHERE ignored_visitor_ips.ip_address = share_visits.ip_address)";
  if (view === "all") return "1 = 1";
  return view === "ignored" ? isIgnored : `NOT ${isIgnored}`;
}

export function visitContextFromHeaders(
  requestHeaders: Headers,
  entryPath: string,
  token: string | null,
  campaign: { source?: string; medium?: string; name?: string } = {},
): VisitContext {
  const ipAddress = clientIpFromHeaders(requestHeaders);
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

export function listShareLinks(view: VisitorVisitView = "active"): ShareLink[] {
  return db.prepare(`
    SELECT
      share_links.token AS token,
      share_links.label AS label,
      share_links.created_at AS createdAt,
      share_links.active AS active,
      COUNT(share_visits.id) AS visitCount,
      MAX(share_visits.visited_at) AS lastVisitedAt
    FROM share_links
    LEFT JOIN share_visits ON share_visits.token = share_links.token AND (${visitorViewWhere(view)})
    GROUP BY share_links.token
    ORDER BY share_links.created_at DESC
  `).all().map((row) => {
    const link = row as Omit<ShareLink, "active" | "visitCount"> & { active: number; visitCount: number };
    return { ...link, active: link.active === 1, visitCount: Number(link.visitCount) };
  });
}

export function countVisitorVisits(view: VisitorVisitView = "all"): number {
  return Number((db.prepare(`SELECT COUNT(*) AS count FROM share_visits WHERE ${visitorViewWhere(view)}`).get() as { count: number }).count);
}

export function listIgnoredVisitorIps(): IgnoredVisitorIp[] {
  return db.prepare(`
    SELECT ignored_visitor_ips.ip_address AS ipAddress,
      ignored_visitor_ips.created_at AS createdAt,
      COUNT(share_visits.id) AS visitCount,
      MAX(share_visits.visited_at) AS lastVisitedAt
    FROM ignored_visitor_ips
    LEFT JOIN share_visits ON share_visits.ip_address = ignored_visitor_ips.ip_address
    GROUP BY ignored_visitor_ips.ip_address
    ORDER BY ignored_visitor_ips.created_at DESC, ignored_visitor_ips.ip_address ASC
  `).all().map((row) => {
    const item = row as Omit<IgnoredVisitorIp, "visitCount"> & { visitCount: number };
    return { ...item, visitCount: Number(item.visitCount) };
  });
}

export function addIgnoredVisitorIp(ipAddress: string): IgnoredVisitorIp {
  const normalizedIp = normalizeVisitorIp(ipAddress);
  if (!normalizedIp) throw new Error("请输入有效的 IPv4 或 IPv6 地址。");
  db.prepare(`
    INSERT INTO ignored_visitor_ips (ip_address, created_at) VALUES (?, ?)
    ON CONFLICT(ip_address) DO NOTHING
  `).run(normalizedIp, new Date().toISOString());
  return listIgnoredVisitorIps().find((item) => item.ipAddress === normalizedIp)!;
}

export function removeIgnoredVisitorIp(ipAddress: string): boolean {
  const normalizedIp = normalizeVisitorIp(ipAddress);
  if (!normalizedIp) return false;
  return db.prepare("DELETE FROM ignored_visitor_ips WHERE ip_address = ?").run(normalizedIp).changes > 0;
}

export function getVisitorRetentionDays(): number {
  const row = db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'visitor_retention_days'").get() as { setting_value: string } | undefined;
  const value = Number(row?.setting_value ?? 0);
  return VISITOR_RETENTION_OPTIONS.includes(value as (typeof VISITOR_RETENTION_OPTIONS)[number]) ? value : 0;
}

export function setVisitorRetentionDays(days: number): { retentionDays: number; deletedCount: number } {
  if (!VISITOR_RETENTION_OPTIONS.includes(days as (typeof VISITOR_RETENTION_OPTIONS)[number])) {
    throw new Error("访问记录保留期限无效。");
  }
  db.prepare(`
    INSERT INTO app_settings (setting_key, setting_value) VALUES ('visitor_retention_days', ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
  `).run(String(days));
  return { retentionDays: days, deletedCount: days ? deleteExpiredVisitorVisits(days) : 0 };
}

function deleteExpiredVisitorVisits(days: number): number {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM share_visits WHERE visited_at < ?").run(cutoff);
  db.prepare(`
    DELETE FROM visitor_ip_geolocations
    WHERE NOT EXISTS (
      SELECT 1 FROM share_visits WHERE share_visits.ip_address = visitor_ip_geolocations.ip_address
    )
  `).run();
  return result.changes;
}

let lastRetentionSweepAt = 0;
function applyVisitorRetentionPolicy(): void {
  const days = getVisitorRetentionDays();
  const now = Date.now();
  if (!days || now - lastRetentionSweepAt < 60 * 60 * 1000) return;
  deleteExpiredVisitorVisits(days);
  lastRetentionSweepAt = now;
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
  applyVisitorRetentionPolicy();
  if (context.token && !getActiveShareLink(context.token)) return null;
  const linkLabel = context.token
    ? (db.prepare("SELECT label FROM share_links WHERE token = ?").get(context.token) as { label: string } | undefined)?.label || "未命名链接"
    : "";
  const visitKey = randomUUID();
  db.prepare(`
    INSERT INTO share_visits (
      token, link_label, visited_at, ip_address, visit_key, entry_path, referrer, user_agent,
      accept_language, is_automated, utm_source, utm_medium, utm_campaign
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    context.token,
    linkLabel,
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
  scheduleIpGeolocationLookup(context.ipAddress);
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
    if (engagement.entryModuleKey) {
      db.prepare("UPDATE share_visits SET entry_module_key = ? WHERE id = ? AND entry_module_key = ''")
        .run(engagement.entryModuleKey, visit.id);
    }
    if (engagement.actions?.length) {
      const upsertAction = db.prepare(`
        INSERT INTO share_visit_actions (visit_id, action_key, action_count) VALUES (?, ?, 1)
        ON CONFLICT(visit_id, action_key) DO UPDATE SET action_count = share_visit_actions.action_count + 1
      `);
      for (const action of engagement.actions) upsertAction.run(visit.id, action);
    }
  });
  updateEngagement();
  return true;
}

export function recordShareVisitEngagement(token: string, visitKey: string, engagement: ShareVisitEngagement): boolean {
  if (!getShareVisitKey(token, visitKey)) return false;
  return recordVisitorVisitEngagement(visitKey, engagement);
}

export function listShareVisits(token: string, limit = 50, view: VisitorVisitView = "active"): ShareVisit[] | null {
  if (!db.prepare("SELECT 1 FROM share_links WHERE token = ?").get(token)) return null;
  return listVisits(`share_visits.token = ? AND (${visitorViewWhere(view)})`, [token], limit);
}

export function listVisitorVisits(limit = 100, view: VisitorVisitView = "active") {
  const activeTotal = countVisitorVisits("active");
  const ignoredTotal = countVisitorVisits("ignored");
  const allTotal = activeTotal + ignoredTotal;
  return {
    total: view === "all" ? allTotal : view === "ignored" ? ignoredTotal : activeTotal,
    activeTotal,
    ignoredTotal,
    allTotal,
    visits: listVisits(visitorViewWhere(view), [], limit),
    sourceSummary: listVisitorSourceSummary(view),
    ignoredIps: listIgnoredVisitorIps(),
    retentionDays: getVisitorRetentionDays(),
  };
}

export function listVisitorSourceSummary(view: VisitorVisitView = "active"): VisitorSourceCount[] {
  const rows = db.prepare(`
    SELECT token, link_label AS linkLabel, referrer, utm_source AS utmSource,
      utm_medium AS utmMedium, utm_campaign AS utmCampaign
    FROM share_visits
    WHERE ${visitorViewWhere(view)}
  `).all() as Array<{ token: string | null; linkLabel: string; referrer: string; utmSource: string; utmMedium: string; utmCampaign: string }>;
  const counts = new Map<string, VisitorSourceCount>();
  for (const row of rows) {
    const source = visitorSource(row);
    const key = `${source.category}\u0000${source.label}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { ...source, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 12);
}

function listVisits(where: string, params: unknown[], limit: number): ShareVisit[] {
  const rows = db.prepare(`
    SELECT
      recent.id AS id,
      recent.visit_key AS visitKey,
      recent.visited_at AS visitedAt,
      recent.ip_address AS ipAddress,
      geo.country AS geoCountry,
      geo.region AS geoRegion,
      geo.city AS geoCity,
      geo.district AS geoDistrict,
      geo.isp AS geoIsp,
      geo.status AS geoStatus,
      recent.duration_seconds AS durationSeconds,
      recent.token AS token,
      COALESCE(NULLIF(recent.link_label, ''), share_links.label, '') AS linkLabel,
      recent.entry_path AS entryPath,
      recent.referrer AS referrer,
      recent.user_agent AS userAgent,
      recent.accept_language AS acceptLanguage,
      recent.is_automated AS isAutomated,
      recent.utm_source AS utmSource,
      recent.utm_medium AS utmMedium,
      recent.utm_campaign AS utmCampaign,
      recent.entry_module_key AS entryModuleKey,
      share_visit_modules.module_key AS moduleKey,
      share_visit_modules.click_count AS clickCount,
      share_visit_modules.dwell_seconds AS dwellSeconds
    FROM (
      SELECT id, visit_key, visited_at, ip_address, duration_seconds, token, link_label,
        entry_path, referrer, user_agent, accept_language, is_automated,
        utm_source, utm_medium, utm_campaign, entry_module_key
      FROM share_visits
      WHERE ${where}
      ORDER BY id DESC
      LIMIT ?
    ) AS recent
    LEFT JOIN visitor_ip_geolocations AS geo ON geo.ip_address = recent.ip_address
    LEFT JOIN share_links ON share_links.token = recent.token
    LEFT JOIN share_visit_modules ON share_visit_modules.visit_id = recent.id
    ORDER BY recent.id DESC, share_visit_modules.module_key ASC
  `).all(...params, limit) as Array<{
    id: number;
    visitKey: string;
    visitedAt: string;
    ipAddress: string;
    geoCountry: string | null;
    geoRegion: string | null;
    geoCity: string | null;
    geoDistrict: string | null;
    geoIsp: string | null;
    geoStatus: "pending" | "success" | "failed" | null;
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
    entryModuleKey: PortfolioModuleKey | "";
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
        ipLocation: [row.geoCountry, row.geoRegion, row.geoCity, row.geoDistrict, row.geoIsp]
          .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
          .join(" · "),
        ipLocationStatus: row.geoStatus === "success"
          ? "resolved"
          : row.geoStatus === "pending"
            ? "pending"
            : row.geoStatus === "failed"
              ? "failed"
              : !row.ipAddress
                ? "unavailable"
                : !isPublicIpAddress(row.ipAddress)
                  ? "private"
                  : "unqueried",
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
        entryModuleKey: row.entryModuleKey,
        modules: [],
        actions: [],
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
  const visitIds = [...visits.keys()];
  if (visitIds.length) {
    const placeholders = visitIds.map(() => "?").join(",");
    const actionRows = db.prepare(`
      SELECT visit_id AS visitId, action_key AS key, action_count AS count
      FROM share_visit_actions WHERE visit_id IN (${placeholders}) ORDER BY action_key ASC
    `).all(...visitIds) as Array<{ visitId: number; key: VisitorActionKey; count: number }>;
    for (const action of actionRows) visits.get(action.visitId)?.actions.push({ key: action.key, count: Number(action.count) });
  }
  return [...visits.values()];
}

export function revokeShareLink(token: string): boolean {
  return db.prepare("UPDATE share_links SET active = 0 WHERE token = ? AND active = 1").run(token).changes > 0;
}

export function deleteShareLink(token: string): boolean {
  return db.prepare("DELETE FROM share_links WHERE token = ?").run(token).changes > 0;
}
