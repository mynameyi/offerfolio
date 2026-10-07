"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/components/admin-fetch";

type ApplicationScript = {
  id: string;
  roleTitle: string;
  company: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ScriptDraft = Pick<ApplicationScript, "roleTitle" | "company" | "content">;

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const emptyDraft: ScriptDraft = { roleTitle: "", company: "", content: "" };

export function ApplicationScripts() {
  const [scripts, setScripts] = useState<ApplicationScript[]>([]);
  const [draft, setDraft] = useState<ScriptDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    const response = await adminFetch("/api/admin/application-scripts", { cache: "no-store" });
    const result = await readJson<ApplicationScript[]>(response);
    if (!response.ok) throw new Error(result.error || "暂时无法读取投递话术。");
    setScripts(result);
  }

  useEffect(() => {
    let active = true;
    refresh()
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "读取投递话术失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openNewForm() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function editScript(script: ApplicationScript) {
    setEditingId(script.id);
    setDraft({ roleTitle: script.roleTitle, company: script.company, content: script.content });
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  async function saveScript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch(editingId ? `/api/admin/application-scripts/${editingId}` : "/api/admin/application-scripts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "保存话术失败。");
      setMessage(editingId ? "话术已更新。" : "话术已保存。可以复制后用于投递。");
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存话术失败。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteScript(script: ApplicationScript) {
    if (!window.confirm(`确定删除“${script.roleTitle}”的话术？此操作无法撤销。`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/application-scripts/${script.id}`, { method: "DELETE" });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "删除话术失败。");
      if (editingId === script.id) {
        setEditingId(null);
        setFormOpen(false);
        setDraft(emptyDraft);
      }
      setMessage("话术已删除。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除话术失败。");
    } finally {
      setBusy(false);
    }
  }

  async function copyScript(script: ApplicationScript) {
    try {
      await navigator.clipboard.writeText(script.content);
      setCopiedId(script.id);
      window.setTimeout(() => setCopiedId((current) => current === script.id ? null : current), 1800);
    } catch {
      setError("复制失败，请手动选择话术内容复制。");
    }
  }

  return (
    <section className="application-scripts">
      <div className="editor-panel scripts-intro-panel">
        <div className="editor-panel-title"><span>03</span><div><h2>投递话术</h2><p>按岗位保存打招呼话术，投递时可直接复制使用。话术仅保存在本机数据库，不会公开展示。</p></div></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
      </div>

      <div className="scripts-list-heading"><div><p className="section-kicker">APPLICATION MESSAGES</p><h2>我的话术</h2></div><span>{scripts.length} 条</span></div>
      <div className="scripts-actions"><p>可按岗位名称或公司区分不同版本。</p><button className="button button-dark" type="button" onClick={openNewForm}>新增话术</button></div>

      {formOpen ? (
        <form className="editor-panel scripts-form" onSubmit={saveScript}>
          <div className="editor-panel-title"><span>{editingId ? "编辑" : "新建"}</span><div><h2>{editingId ? "编辑话术" : "新建投递话术"}</h2><p>填写投递岗位、公司（可选）和实际发送的招呼内容。</p></div></div>
          <div className="editor-fields editor-fields-two">
            <label className="field-label">岗位名称<input className="field-input" required maxLength={160} value={draft.roleTitle} onChange={(event) => setDraft((current) => ({ ...current, roleTitle: event.target.value }))} placeholder="例如：资深前端工程师" /></label>
            <label className="field-label">公司名称（可选）<input className="field-input" maxLength={160} value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="例如：某某科技" /></label>
            <label className="field-label scripts-message-field">打招呼话术<textarea className="field-input field-textarea" required maxLength={10000} rows={7} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="写下针对该岗位的开场介绍、匹配经验和沟通意向。" /></label>
          </div>
          <div className="scripts-form-actions"><button className="button button-quiet" type="button" disabled={busy} onClick={() => { setFormOpen(false); setEditingId(null); setDraft(emptyDraft); }}>取消</button><button className="button button-dark" type="submit" disabled={busy}>{busy ? "正在保存…" : "保存话术"}</button></div>
        </form>
      ) : null}

      {loading ? <div className="radar-empty"><span className="loading-spinner" />正在读取话术…</div> : scripts.length ? (
        <div className="scripts-list">
          {scripts.map((script) => (
            <article className="script-card" key={script.id}>
              <div className="script-card-heading"><div><h3>{script.roleTitle}</h3>{script.company ? <span>{script.company}</span> : null}</div><small>更新于 {formatDate(script.updatedAt)}</small></div>
              <p className="script-card-content">{script.content}</p>
              <div className="script-card-actions"><button className="button button-quiet" type="button" onClick={() => void copyScript(script)}>{copiedId === script.id ? "已复制" : "复制话术"}</button><button className="button button-quiet" type="button" onClick={() => editScript(script)}>编辑</button><button className="button button-quiet script-delete" type="button" disabled={busy} onClick={() => void deleteScript(script)}>删除</button></div>
            </article>
          ))}
        </div>
      ) : <div className="radar-empty">还没有保存的话术。点击“新增话术”，为不同岗位准备各自的打招呼内容。</div>}
    </section>
  );
}
