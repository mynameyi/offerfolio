"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type ShareLink = {
  token: string;
  label: string;
  createdAt: string;
  active: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "暂无访问";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function VisitorRadar() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [visits, setVisits] = useState<Record<string, string[]>>({});
  const [label, setLabel] = useState("");
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/share-links", { cache: "no-store" });
    const result = await readJson<ShareLink[]>(response);
    if (!response.ok) throw new Error(result.error || "暂时无法读取访问记录。");
    setLinks(result);
  }, []);

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    fetch("/api/admin/share-links", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ShareLink[] & { error?: string };
        if (!response.ok) throw new Error(result.error || "暂时无法读取访问记录。");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setLinks(result);
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "读取访问记录失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/share-links", {
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
      const response = await fetch(`/api/admin/share-links/${token}/visits`, { cache: "no-store" });
      const result = await readJson<string[]>(response);
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
      const response = await fetch(`/api/admin/share-links/${token}`, { method: "PATCH" });
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

  return (
    <section className="visitor-radar">
      <div className="editor-panel radar-intro-panel">
        <div className="editor-panel-title"><span>03</span><div><h2>访问雷达</h2><p>为不同的简历投递生成专属链接，查看每条链接的访问次数和最近访问时间。</p></div></div>
        <form className="radar-create-form" onSubmit={createLink}>
          <label className="field-label" htmlFor="share-link-label">链接备注 <span className="field-hint">可选，仅自己可见，用于区分链接</span></label>
          <div className="radar-create-controls"><input id="share-link-label" className="field-input" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} placeholder="备注这条链接" /><button className="button button-dark" type="submit" disabled={busy}>生成专属链接</button></div>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
      </div>

      <div className="radar-list-heading"><div><p className="section-kicker">SHARE LINKS</p><h2>投递链接</h2></div><span>{links.length} 条</span></div>
      {loading ? <div className="radar-empty"><span className="loading-spinner" />正在读取链接…</div> : links.length ? (
        <div className="radar-link-list">
          {links.map((link) => (
            <article className={`radar-link-card ${!link.active ? "is-revoked" : ""}`} key={link.token}>
              <div className="radar-link-top"><div><div className="radar-link-name"><h3>{link.label || "未命名链接"}</h3><span className={`radar-link-status ${link.active ? "is-active" : ""}`}>{link.active ? "有效" : "已停用"}</span></div><p>创建于 {formatDate(link.createdAt)}</p></div><strong className="radar-visit-count">{link.visitCount}<small>次访问</small></strong></div>
              <div className="radar-link-url"><code>{origin ? `${origin}/r/${link.token}` : `/r/${link.token}`}</code><div><button className="button button-quiet" type="button" onClick={() => void copyLink(link.token)}>{copiedToken === link.token ? "已复制" : "复制链接"}</button><button className="button button-quiet" type="button" onClick={() => void toggleVisits(link.token)}>{expandedToken === link.token ? "收起记录" : "访问记录"}</button>{link.active ? <button className="button button-quiet radar-revoke" type="button" disabled={busy} onClick={() => void revokeLink(link.token)}>停用</button> : null}</div></div>
              <p className="radar-last-visit">最近访问：{formatDate(link.lastVisitedAt)}</p>
              {expandedToken === link.token ? <div className="radar-visit-history"><strong>最近 50 次访问</strong>{visits[link.token] ? visits[link.token].length ? <ol>{visits[link.token].map((visit, index) => <li key={`${visit}-${index}`}>{formatDate(visit)}</li>)}</ol> : <p>还没有访问记录。</p> : <p><span className="loading-spinner" />正在读取记录…</p>}</div> : null}
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">还没有专属链接。生成后可把链接附在简历投递中，并在这里查看访问情况。</div>}
      <p className="radar-footnote">访问次数按每个浏览器 30 分钟内首次打开计算，不采集访客身份信息。</p>
    </section>
  );
}
