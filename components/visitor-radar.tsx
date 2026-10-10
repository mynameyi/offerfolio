"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { PROFILE_MODULES, type PortfolioModuleKey } from "@/lib/profile";
import { adminFetch } from "@/components/admin-fetch";
import { visitorActionLabels, visitorSource, VISITOR_RETENTION_OPTIONS, type VisitorSourceCount } from "@/lib/radar-common";

type ShareLink = {
  token: string;
  label: string;
  createdAt: string;
  active: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
};

type ShareVisit = {
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
  modules: Array<{ key: PortfolioModuleKey; clickCount: number; dwellSeconds: number }>;
  actions: Array<{ key: "contact" | "resume" | "github" | "gitee"; count: number }>;
};

type VisitorView = "active" | "ignored" | "all";
type IgnoredVisitorIp = { ipAddress: string; createdAt: string; visitCount: number; lastVisitedAt: string | null };
type VisitorRecordsResponse = {
  total: number;
  activeTotal: number;
  ignoredTotal: number;
  allTotal: number;
  visits: ShareVisit[];
  sourceSummary: VisitorSourceCount[];
  ignoredIps: IgnoredVisitorIp[];
  retentionDays: number;
};

const moduleLabels = new Map(PROFILE_MODULES.map(({ key, label }) => [key, label]));

function formatDate(value: string | null) {
  if (!value) return "暂无访问";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分`;
}

function describeIpLocation(visit: ShareVisit) {
  if (visit.ipLocation) return visit.ipLocation;
  const statusText = {
    resolved: "未返回归属地",
    pending: "查询中",
    failed: "查询失败，之后会重试",
    private: "内网 IP，无法查询",
    unqueried: "尚未查询（仅新访客触发）",
    unavailable: "无法获取 IP",
  }[visit.ipLocationStatus];
  return statusText || "未返回归属地";
}

function describeUserAgent(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "未知浏览器";
  const system = /Windows/.test(userAgent) ? "Windows" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad|iPod/.test(userAgent) ? "iOS" : /Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "未知系统";
  return `${system} · ${browser}`;
}

function isPrivateOrLocalIp(value: string) {
  if (value.includes(":")) {
    const normalized = value.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || (first === 169 && second === 254) || (first === 100 && second >= 64 && second <= 127);
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function VisitorRadar() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [visits, setVisits] = useState<Record<string, ShareVisit[]>>({});
  const [allVisits, setAllVisits] = useState<ShareVisit[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [activeVisitCount, setActiveVisitCount] = useState(0);
  const [ignoredVisitCount, setIgnoredVisitCount] = useState(0);
  const [allVisitCount, setAllVisitCount] = useState(0);
  const [ignoredIps, setIgnoredIps] = useState<IgnoredVisitorIp[]>([]);
  const [visitView, setVisitView] = useState<VisitorView>("active");
  const [sourceSummary, setSourceSummary] = useState<VisitorSourceCount[]>([]);
  const [retentionDays, setRetentionDays] = useState(0);
  const [retentionChoice, setRetentionChoice] = useState(0);
  const [label, setLabel] = useState("");
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const [linksResponse, visitsResponse] = await Promise.all([
      adminFetch(`/api/admin/share-links?view=${visitView}`, { cache: "no-store" }),
      adminFetch(`/api/admin/visits?view=${visitView}`, { cache: "no-store" }),
    ]);
    const linksResult = await readJson<ShareLink[]>(linksResponse);
    const visitsResult = await readJson<VisitorRecordsResponse>(visitsResponse);
    if (!linksResponse.ok) throw new Error(linksResult.error || "暂时无法读取专属链接。");
    if (!visitsResponse.ok) throw new Error(visitsResult.error || "暂时无法读取访客记录。");
    if (sequence !== refreshSequence.current) return;
    setLinks(linksResult);
    setAllVisits(visitsResult.visits);
    setVisitCount(visitsResult.total);
    setActiveVisitCount(visitsResult.activeTotal);
    setIgnoredVisitCount(visitsResult.ignoredTotal);
    setAllVisitCount(visitsResult.allTotal);
    setIgnoredIps(visitsResult.ignoredIps);
    setSourceSummary(visitsResult.sourceSummary);
    setRetentionDays(visitsResult.retentionDays);
    setRetentionChoice(visitsResult.retentionDays);
  }, [visitView]);

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    refresh()
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "读取访问记录失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const result = await readJson<ShareLink>(response);
      if (!response.ok) throw new Error(result.error || "创建链接失败。");
      setLabel("");
      setMessage("专属链接已生成，可以复制后用于投递简历。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建链接失败。");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken((current) => current === token ? null : current), 1800);
    } catch {
      setError("复制失败，请手动复制链接地址。");
    }
  }

  async function toggleVisits(token: string) {
    setError("");
    if (expandedToken === token) {
      setExpandedToken(null);
      return;
    }
    setExpandedToken(token);
    if (visits[token]) return;
    try {
      const response = await adminFetch(`/api/admin/share-links/${token}/visits?view=${visitView}`, { cache: "no-store" });
      const result = await readJson<ShareVisit[]>(response);
      if (!response.ok) throw new Error(result.error || "无法读取访问详情。");
      setVisits((current) => ({ ...current, [token]: result }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取访问详情。");
    }
  }

  async function changeIgnoredIp(ipAddress: string, ignored: boolean) {
    const alreadyIgnored = ignoredIps.some((item) => item.ipAddress === ipAddress);
    if (ignored === alreadyIgnored) return;
    if (ignored) {
      const warning = isPrivateOrLocalIp(ipAddress)
        ? `IP ${ipAddress} 属于内网、保留或本机地址，可能是 Docker / 反向代理地址，多个真实访客可能共用。忽略后会隐藏这个 IP 的全部历史和后续记录，但不会删除记录。仍要忽略吗？`
        : `忽略 IP ${ipAddress}？该 IP 的全部历史和后续访问会从默认统计中隐藏，记录不会删除，可随时恢复。`;
      if (!window.confirm(warning)) return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = ignored
        ? await adminFetch("/api/admin/ignored-ips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ipAddress }),
          })
        : await adminFetch(`/api/admin/ignored-ips?ip=${encodeURIComponent(ipAddress)}`, { method: "DELETE" });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || (ignored ? "忽略 IP 失败。" : "恢复 IP 统计失败。"));
      setVisits({});
      setMessage(ignored ? `已忽略 ${ipAddress}，历史记录仍然保留。` : `已恢复 ${ipAddress} 的统计，历史记录重新计入。`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新忽略 IP 失败。");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink(token: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/share-links/${token}`, { method: "PATCH" });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "停用链接失败。");
      setMessage("专属链接已停用，访问者将无法再打开该链接。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "停用链接失败。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLink(token: string, linkLabel: string) {
    if (!window.confirm(`确定删除“${linkLabel || "未命名链接"}”？该链接将从列表移除，已有访客记录会保留并继续显示其投递备注。`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/share-links/${token}`, { method: "DELETE" });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "删除链接失败。");
      setMessage("专属链接已删除，已有访问记录已保留。");
      setVisits((current) => { const next = { ...current }; delete next[token]; return next; });
      if (expandedToken === token) setExpandedToken(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除链接失败。");
    } finally {
      setBusy(false);
    }
  }

  async function saveRetention() {
    const message = retentionChoice === 0
      ? "关闭自动清理。已有访问记录会继续保留。"
      : `设置为保留最近 ${retentionChoice} 天。超过期限的访问记录将被永久删除，是否继续？`;
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: retentionChoice }),
      });
      const result = await readJson<{ retentionDays: number; deletedCount: number }>(response);
      if (!response.ok) throw new Error(result.error || "保存保留期限失败。");
      setRetentionDays(result.retentionDays);
      setMessage(result.deletedCount
        ? `保留期限已更新，已清理 ${result.deletedCount} 条过期访问记录。`
        : "访问记录保留期限已更新。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存保留期限失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="visitor-radar">
      <div className="editor-panel radar-intro-panel">
        <div className="editor-panel-title"><span>04</span><div><h2>访问雷达</h2><p>所有公开主页访问都会记录。专属链接额外标记投递来源；直接访问也会出现在访客记录中。</p></div></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
      </div>

      <div className="radar-source-summary">
        <div className="radar-list-heading"><div><p className="section-kicker">TRAFFIC SOURCES</p><h2>访问来源汇总</h2></div><span>{visitView === "all" ? "按全部记录统计" : visitView === "ignored" ? "按已忽略记录统计" : "按未忽略记录统计"}</span></div>
        {sourceSummary.length ? <ul>{sourceSummary.map((source) => <li key={`${source.category}-${source.label}`}><span>{source.category}</span><strong>{source.label}</strong><b>{source.count}<small>次</small></b></li>)}</ul> : <p className="radar-empty">还没有来源数据。来源页可能会被浏览器隐藏；使用专属投递链接或 UTM 参数通常更容易准确归因。</p>}
      </div>

      <div className="editor-panel radar-retention-panel">
        <div><strong>访问记录保留期限</strong><p>启用后会立即清理超期记录，并在后续访问时定期清理；选择“不自动清理”会持续保留记录。</p></div>
        <div className="radar-retention-controls">
          <select className="field-input" aria-label="访问记录保留期限" value={retentionChoice} onChange={(event) => setRetentionChoice(Number(event.target.value))}>
            {VISITOR_RETENTION_OPTIONS.map((days) => <option key={days} value={days}>{days === 0 ? "不自动清理" : `${days} 天`}</option>)}
          </select>
          <button className="button button-quiet" type="button" disabled={busy || retentionChoice === retentionDays} onClick={() => void saveRetention()}>保存期限</button>
        </div>
      </div>

      <div className="radar-list-heading radar-visits-heading"><div><p className="section-kicker">VISITOR RECORDS</p><h2>访客记录</h2></div><span>{visitCount} 次访问 · 显示最近 {allVisits.length} 条</span></div>
      <p className="radar-scope-note">公网 IP 归属地默认通过 HTTPS 访问 ipwho.is；查询失败时会改用 ip-api.com 的免费 HTTP 接口重试。查询时 IP 会发送给对应服务商，结果按 IP 缓存；内网 IP 不查询。</p>
      <div className="radar-visit-filters" role="group" aria-label="访客记录筛选">
        <button className={visitView === "active" ? "is-selected" : ""} type="button" aria-pressed={visitView === "active"} onClick={() => { setLoading(true); setVisits({}); setError(""); setVisitView("active"); }}>未忽略 <span>{activeVisitCount}</span></button>
        <button className={visitView === "ignored" ? "is-selected" : ""} type="button" aria-pressed={visitView === "ignored"} onClick={() => { setLoading(true); setVisits({}); setError(""); setVisitView("ignored"); }}>已忽略 <span>{ignoredVisitCount}</span></button>
        <button className={visitView === "all" ? "is-selected" : ""} type="button" aria-pressed={visitView === "all"} onClick={() => { setLoading(true); setVisits({}); setError(""); setVisitView("all"); }}>全部 <span>{allVisitCount}</span></button>
      </div>
      {visitView === "ignored" ? (
        <div className="radar-ignored-panel">
          <div className="radar-ignored-heading"><div><strong>忽略 IP 列表</strong><p>按完整 IP 匹配；忽略只影响统计展示，不会删除历史记录。</p></div><span>{ignoredIps.length} 个</span></div>
          {ignoredIps.length ? <ul>{ignoredIps.map((item) => <li key={item.ipAddress}><div><strong>{item.ipAddress}</strong><span>{item.visitCount} 次记录 · 最近访问 {formatDate(item.lastVisitedAt)}</span></div><button className="button button-quiet" type="button" disabled={busy} onClick={() => void changeIgnoredIp(item.ipAddress, false)}>恢复统计</button></li>)}</ul> : <p className="radar-empty">忽略列表还是空的。可以在访客记录中按 IP 添加。</p>}
        </div>
      ) : null}
      {loading ? <div className="radar-empty"><span className="loading-spinner" />正在读取访客记录…</div> : error ? null : allVisits.length ? (
        <div className="radar-visit-entries radar-all-visits">
          {allVisits.map((visit) => (
            <article className="radar-visit-entry" key={visit.visitKey}>
              <div className="radar-visit-meta">
                <time>{formatDate(visit.visitedAt)}</time>
                <span className="radar-ip-control">IP：{visit.ipAddress || "未获取"}{visit.ipAddress ? <><span className={ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "radar-ip-ignored" : "radar-ip-active"}>{ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "已忽略" : ""}</span><button className="radar-ip-action" type="button" disabled={busy} onClick={() => void changeIgnoredIp(visit.ipAddress, !ignoredIps.some((item) => item.ipAddress === visit.ipAddress))}>{ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "恢复统计" : "忽略 IP"}</button></> : null}</span>
                <span>{visit.token || visit.linkLabel || visit.entryPath.startsWith("/r/") ? `专属链接：${visit.linkLabel || "未命名"}` : "普通访问"}</span>
                <span>页面停留：{formatDuration(visit.durationSeconds)}</span>
                {visit.entryModuleKey ? <span>首次进入：{moduleLabels.get(visit.entryModuleKey) || visit.entryModuleKey}</span> : null}
                {visit.isAutomated ? <span className="radar-automated-tag">可能是机器人或链接预览</span> : null}
              </div>
              <div className="radar-visit-context">
                <span>IP归属地：{describeIpLocation(visit)}</span>
                <span>入口：{visit.entryPath.startsWith("/r/") ? "专属链接" : visit.entryPath}</span>
                <span>归因：{visitorSource(visit).category} · {visitorSource(visit).label}</span>
                <span>来源页：{visit.referrer || "直接进入 / 未提供来源页"}</span>
                <span>终端：{describeUserAgent(visit.userAgent)}</span>
                {visit.acceptLanguage ? <span>语言：{visit.acceptLanguage}</span> : null}
                {visit.utmSource || visit.utmMedium || visit.utmCampaign ? <span>UTM：{[visit.utmSource, visit.utmMedium, visit.utmCampaign].filter(Boolean).join(" / ")}</span> : null}
              </div>
              {visit.modules.length ? <ul className="radar-visit-modules">{visit.modules.map((module) => <li key={module.key}><strong>{moduleLabels.get(module.key) || module.key}</strong><span>{module.clickCount ? `导航点击 ${module.clickCount} 次` : "未点击导航"}</span><span>停留 {formatDuration(module.dwellSeconds)}</span></li>)}</ul> : <p className="radar-no-engagement">模块行为数据会在访问页面开始停留或点击后出现。</p>}
              {visit.actions.length ? <div className="radar-visit-actions"><strong>关键操作</strong>{visit.actions.map((action) => <span key={action.key}>{visitorActionLabels[action.key] || action.key} {action.count} 次</span>)}</div> : null}
              {visit.userAgent ? <details className="radar-agent-details"><summary>终端原始信息</summary><code>{visit.userAgent}</code></details> : null}
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">{visitView === "ignored" ? "当前没有已忽略 IP 的访问记录。" : allVisitCount ? "当前筛选下没有访问记录。" : "还没有公开主页访问记录。直接访问主页和通过专属链接进入都会记录在这里。"}</div>}

      <div className="radar-list-heading"><div><p className="section-kicker">SHARE LINKS</p><h2>专属投递链接</h2></div><span>{links.length} 条链接 · {links.reduce((total, link) => total + link.visitCount, 0)} 次访问</span></div>
      <p className="radar-scope-note">专属链接用于识别具体投递来源；所有访客记录也会汇总显示在上方。</p>
      <form className="editor-panel radar-create-form" onSubmit={createLink}>
        <label className="field-label" htmlFor="share-link-label">链接备注 <span className="field-hint">可选，仅自己可见，用于区分投递</span></label>
        <div className="radar-create-controls"><input id="share-link-label" className="field-input" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} placeholder="例如：前端工程师 · A 公司" /><button className="button button-dark" type="submit" disabled={busy}>生成专属链接</button></div>
      </form>
      {loading ? <div className="radar-empty"><span className="loading-spinner" />正在读取链接…</div> : error ? null : links.length ? (
        <div className="radar-link-list">
          {links.map((link) => (
            <article className={`radar-link-card ${!link.active ? "is-revoked" : ""}`} key={link.token}>
              <div className="radar-link-top"><div><div className="radar-link-name"><h3>{link.label || "未命名链接"}</h3><span className={`radar-link-status ${link.active ? "is-active" : ""}`}>{link.active ? "有效" : "已停用"}</span></div><p>创建于 {formatDate(link.createdAt)}</p></div><strong className="radar-visit-count">{link.visitCount}<small>次访问</small></strong></div>
              <div className="radar-link-url"><code>{origin ? `${origin}/r/${link.token}` : `/r/${link.token}`}</code><div><button className="button button-quiet" type="button" onClick={() => void copyLink(link.token)}>{copiedToken === link.token ? "已复制" : "复制链接"}</button><button className="button button-quiet" type="button" onClick={() => void toggleVisits(link.token)}>{expandedToken === link.token ? "收起记录" : "访问记录"}</button>{link.active ? <button className="button button-quiet radar-revoke" type="button" disabled={busy} onClick={() => void revokeLink(link.token)}>停用</button> : null}<button className="button button-quiet radar-delete" type="button" disabled={busy} onClick={() => void deleteLink(link.token, link.label)}>删除</button></div></div>
              <p className="radar-last-visit">最近访问：{formatDate(link.lastVisitedAt)}</p>
              {expandedToken === link.token ? (
                <div className="radar-visit-history">
                  <strong>最近 50 次访问 · 来源 / 入口 / 操作</strong>
                  {visits[link.token] ? visits[link.token].length ? (
                    <div className="radar-visit-entries">
                      {visits[link.token].map((visit) => {
                        const source = visitorSource(visit);
                        return (
                          <article className="radar-visit-entry" key={visit.visitKey}>
                            <div className="radar-visit-meta"><time>{formatDate(visit.visitedAt)}</time><span className="radar-ip-control">IP：{visit.ipAddress || "未获取"}{visit.ipAddress ? <><span className={ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "radar-ip-ignored" : "radar-ip-active"}>{ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "已忽略" : ""}</span><button className="radar-ip-action" type="button" disabled={busy} onClick={() => void changeIgnoredIp(visit.ipAddress, !ignoredIps.some((item) => item.ipAddress === visit.ipAddress))}>{ignoredIps.some((item) => item.ipAddress === visit.ipAddress) ? "恢复统计" : "忽略 IP"}</button></> : null}</span><span>页面停留：{formatDuration(visit.durationSeconds)}</span>{visit.entryModuleKey ? <span>首次进入：{moduleLabels.get(visit.entryModuleKey) || visit.entryModuleKey}</span> : null}</div>
                            <div className="radar-visit-context"><span>IP归属地：{describeIpLocation(visit)}</span><span>归因：{source.category} · {source.label}</span><span>来源页：{visit.referrer || "未提供"}</span>{visit.utmSource || visit.utmMedium || visit.utmCampaign ? <span>UTM：{[visit.utmSource, visit.utmMedium, visit.utmCampaign].filter(Boolean).join(" / ")}</span> : null}</div>
                            {visit.modules.length ? <ul>{visit.modules.map((module) => <li key={module.key}><strong>{moduleLabels.get(module.key) || module.key}</strong><span>{module.clickCount ? `导航点击 ${module.clickCount} 次` : "未点击导航"}</span><span>停留 {formatDuration(module.dwellSeconds)}</span></li>)}</ul> : <p className="radar-no-engagement">尚无模块点击或可见停留记录。</p>}
                            {visit.actions.length ? <div className="radar-visit-actions"><strong>关键操作</strong>{visit.actions.map((action) => <span key={action.key}>{visitorActionLabels[action.key] || action.key} {action.count} 次</span>)}</div> : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : <p>这条专属链接还没有访问记录。请将卡片中的链接用于简历投递；访客打开后，记录会显示在这里。</p> : <p><span className="loading-spinner" />正在读取记录…</p>}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">{loading ? null : "还没有专属投递链接。所有公开页面访问仍会显示在上方；创建专属链接后，可将访问单独归因到对应投递。"}</div>}
      <p className="radar-footnote">来源页由浏览器 Referer 提供，可能被浏览器或邮件、社交应用隐藏；专属投递链接和 UTM 参数更可靠。首次进入位置、联系我、简历下载、GitHub 和 Gitee 点击需要访客浏览器运行脚本后才能记录。机器人判断依据浏览器标识，仅供参考。</p>
    </section>
  );
}
