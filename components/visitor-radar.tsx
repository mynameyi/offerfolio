"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PROFILE_MODULES, type PortfolioModuleKey } from "@/lib/profile";
import { adminFetch } from "@/components/admin-fetch";

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
  modules: Array<{ key: PortfolioModuleKey; clickCount: number; dwellSeconds: number }>;
};

type VisitorRecordsResponse = { total: number; visits: ShareVisit[] };

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

function describeUserAgent(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "未知浏览器";
  const system = /Windows/.test(userAgent) ? "Windows" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad|iPod/.test(userAgent) ? "iOS" : /Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "未知系统";
  return `${system} · ${browser}`;
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function VisitorRadar() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [visits, setVisits] = useState<Record<string, ShareVisit[]>>({});
  const [allVisits, setAllVisits] = useState<ShareVisit[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [label, setLabel] = useState("");
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const [linksResponse, visitsResponse] = await Promise.all([
      adminFetch("/api/admin/share-links", { cache: "no-store" }),
      adminFetch("/api/admin/visits", { cache: "no-store" }),
    ]);
    const linksResult = await readJson<ShareLink[]>(linksResponse);
    const visitsResult = await readJson<VisitorRecordsResponse>(visitsResponse);
    if (!linksResponse.ok) throw new Error(linksResult.error || "暂时无法读取专属链接。");
    if (!visitsResponse.ok) throw new Error(visitsResult.error || "暂时无法读取访客记录。");
    setLinks(linksResult);
    setAllVisits(visitsResult.visits);
    setVisitCount(visitsResult.total);
  }, []);

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
      const response = await adminFetch(`/api/admin/share-links/${token}/visits`, { cache: "no-store" });
      const result = await readJson<ShareVisit[]>(response);
      if (!response.ok) throw new Error(result.error || "无法读取访问详情。");
      setVisits((current) => ({ ...current, [token]: result }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取访问详情。");
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

  return (
    <section className="visitor-radar">
      <div className="editor-panel radar-intro-panel">
        <div className="editor-panel-title"><span>04</span><div><h2>访问雷达</h2><p>所有公开主页访问都会记录。专属链接额外标记投递来源；直接访问也会出现在访客记录中。</p></div></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
      </div>

      <div className="radar-list-heading"><div><p className="section-kicker">ALL VISITS</p><h2>全部访客记录</h2></div><span>{visitCount} 次访问 · 显示最近 {allVisits.length} 条</span></div>
      {loading ? <div className="radar-empty"><span className="loading-spinner" />正在读取访客记录…</div> : error ? null : allVisits.length ? (
        <div className="radar-visit-entries radar-all-visits">
          {allVisits.map((visit) => (
            <article className="radar-visit-entry" key={visit.visitKey}>
              <div className="radar-visit-meta">
                <time>{formatDate(visit.visitedAt)}</time>
                <span>IP：{visit.ipAddress || "未获取"}</span>
                <span>{visit.token || visit.linkLabel || visit.entryPath.startsWith("/r/") ? `专属链接：${visit.linkLabel || "未命名"}` : "普通访问"}</span>
                <span>页面停留：{formatDuration(visit.durationSeconds)}</span>
                {visit.isAutomated ? <span className="radar-automated-tag">可能是机器人或链接预览</span> : null}
              </div>
              <div className="radar-visit-context">
                <span>入口：{visit.entryPath.startsWith("/r/") ? "专属链接" : visit.entryPath}</span>
                <span>来源：{visit.referrer || "直接进入 / 未提供来源页"}</span>
                <span>终端：{describeUserAgent(visit.userAgent)}</span>
                {visit.acceptLanguage ? <span>语言：{visit.acceptLanguage}</span> : null}
                {visit.utmSource || visit.utmMedium || visit.utmCampaign ? <span>UTM：{[visit.utmSource, visit.utmMedium, visit.utmCampaign].filter(Boolean).join(" / ")}</span> : null}
              </div>
              {visit.modules.length ? <ul className="radar-visit-modules">{visit.modules.map((module) => <li key={module.key}><strong>{moduleLabels.get(module.key) || module.key}</strong><span>{module.clickCount ? `导航点击 ${module.clickCount} 次` : "未点击导航"}</span><span>停留 {formatDuration(module.dwellSeconds)}</span></li>)}</ul> : <p className="radar-no-engagement">模块行为数据会在访问页面开始停留或点击后出现。</p>}
              {visit.userAgent ? <details className="radar-agent-details"><summary>终端原始信息</summary><code>{visit.userAgent}</code></details> : null}
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">还没有公开主页访问记录。直接访问主页和通过专属链接进入都会记录在这里。</div>}

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
              {expandedToken === link.token ? <div className="radar-visit-history"><strong>最近 50 次访问 · 时间 / IP / 停留 / 模块</strong>{visits[link.token] ? visits[link.token].length ? <div className="radar-visit-entries">{visits[link.token].map((visit) => <article className="radar-visit-entry" key={visit.visitKey}><div className="radar-visit-meta"><time>{formatDate(visit.visitedAt)}</time><span>IP：{visit.ipAddress || "未获取"}</span><span>页面停留：{formatDuration(visit.durationSeconds)}</span></div>{visit.modules.length ? <ul>{visit.modules.map((module) => <li key={module.key}><strong>{moduleLabels.get(module.key) || module.key}</strong><span>{module.clickCount ? `导航点击 ${module.clickCount} 次` : "未点击导航"}</span><span>停留 {formatDuration(module.dwellSeconds)}</span></li>)}</ul> : <p className="radar-no-engagement">尚无模块点击或可见停留记录。</p>}</article>)}</div> : <p>这条专属链接还没有访问记录。请将卡片中的链接用于简历投递；访客打开后，记录会显示在这里。</p> : <p><span className="loading-spinner" />正在读取记录…</p>}</div> : null}
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">{loading ? null : "还没有专属投递链接。所有公开页面访问仍会显示在上方；创建专属链接后，可将访问单独归因到对应投递。"}</div>}
      <p className="radar-footnote">每次进入公开主页都会生成一条访问记录，链接预览和机器人访问会保留并标记为“可能是机器人或链接预览”，不自动过滤。模块点击目前统计页内导航；停留时长仅在页面处于前台且模块可见时累计。IP 从 X-Real-IP / X-Forwarded-For 请求头读取，反向代理需正确转发。</p>
    </section>
  );
}
