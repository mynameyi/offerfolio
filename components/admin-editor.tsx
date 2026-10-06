"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DEFAULT_PROFILE, PROFILE_MODULES, type PortfolioMilestone, type PortfolioModuleKey, type PortfolioProfile, type PortfolioProject } from "@/lib/profile";
import { Glyph } from "@/components/glyph";

type EditorMode = "checking" | "login" | "editing";

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function AdminEditor() {
  const [mode, setMode] = useState<EditorMode>("checking");
  const [configured, setConfigured] = useState(true);
  const [profile, setProfile] = useState<PortfolioProfile>(DEFAULT_PROFILE);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) throw new Error("暂时无法读取档案内容。");
    setProfile(await response.json() as PortfolioProfile);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const session = await readJson<{ authenticated: boolean; configured: boolean }>(response);
        if (!active) return;
        setConfigured(session.configured);
        if (session.authenticated) {
          await loadProfile();
          if (active) setMode("editing");
        } else {
          setMode("login");
        }
      } catch {
        if (active) {
          setError("连接服务失败，请稍后刷新页面。 ");
          setMode("login");
        }
      }
    }
    void checkSession();
    return () => { active = false; };
  }, [loadProfile]);

  function setField<K extends keyof PortfolioProfile>(key: K, value: PortfolioProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "登录失败。");
      await loadProfile();
      setPassword("");
      setMode("editing");
      setMessage("已安全登录。你修改的内容会保存到本机数据库。 ");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请重试。 ");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await readJson<PortfolioProfile>(response);
      if (!response.ok) throw new Error(result.error || "保存失败，请重试。 ");
      setProfile(result);
      setMessage("档案已保存，公开页面已同步更新。 ");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败，请重试。 ");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMode("login");
    setMessage("已退出管理后台。 ");
  }

  function updateProject(index: number, key: keyof PortfolioProject, value: string | string[]) {
    setProfile((current) => ({
      ...current,
      projects: current.projects.map((project, projectIndex) => projectIndex === index ? { ...project, [key]: value } : project),
    }));
  }

  function updateMilestone<K extends keyof PortfolioMilestone>(index: number, key: K, value: PortfolioMilestone[K]) {
    setProfile((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, milestoneIndex) => milestoneIndex === index ? { ...milestone, [key]: value } : milestone),
    }));
  }

  function setModule(key: PortfolioModuleKey, visible: boolean) {
    setProfile((current) => ({ ...current, modules: { ...current.modules, [key]: visible } }));
  }

  function addProject() {
    setProfile((current) => ({
      ...current,
      projects: [...current.projects, { id: crypto.randomUUID(), title: "新项目", summary: "", tags: [], evidenceLabel: "查看项目", evidenceUrl: "" }],
    }));
  }

  function removeProject(index: number) {
    setProfile((current) => ({ ...current, projects: current.projects.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function addMilestone() {
    setProfile((current) => ({
      ...current,
      milestones: [...current.milestones, { id: crypto.randomUUID(), kind: "experience", period: "", title: "", organization: "", summary: "" }],
    }));
  }

  function removeMilestone(index: number) {
    setProfile((current) => ({ ...current, milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index) }));
  }

  if (mode === "checking") {
    return <section className="admin-loading"><span className="loading-spinner" />正在验证管理会话…</section>;
  }

  if (mode === "login") {
    return (
      <section className="login-layout">
        <div className="login-intro">
          <p className="section-kicker">ECKYSTUDIO / OFFERFOLIO</p>
          <h1>让你的经历，<br /><em>说得更清楚。</em></h1>
          <p>在这里编辑公开档案。内容保存到当前主机的 SQLite 数据库，不需要重新构建或发布。</p>
          <div className="login-proof"><Glyph name="lock" /><span>仅本机管理员可修改档案</span></div>
        </div>
        <form className="login-card" onSubmit={submitLogin}>
          <span className="login-card-mark"><Glyph name="lock" /></span>
          <p className="section-kicker">管理后台</p>
          <h2>欢迎回来</h2>
          <p className="muted-text">输入本地配置的管理密码以继续。</p>
          {!configured ? <div className="notice notice-error">后台尚未启用。请从 .env.example 创建 .env 并设置 ADMIN_PASSWORD。</div> : null}
          <label className="field-label" htmlFor="admin-password">管理密码</label>
          <input id="admin-password" className="field-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configured} required />
          <button className="button button-dark login-submit" type="submit" disabled={busy || !configured}>{busy ? "正在验证…" : "进入档案管理"}<Glyph name="arrow" /></button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <p className="login-footnote">忘记密码？在 .env 中修改 ADMIN_PASSWORD 后重启服务。</p>
        </form>
      </section>
    );
  }

  return (
    <section className="editor-layout">
      <div className="editor-heading">
        <div>
          <p className="section-kicker">你的内容 · 你的数据</p>
          <h1>档案管理</h1>
          <p>填写后保存，公开页面会立即更新。未填完的信息可以先保留演示文案。</p>
        </div>
        <div className="editor-heading-actions">
          <a className="button button-quiet" href="/" target="_blank" rel="noreferrer">预览公开页面 <Glyph name="arrow" /></a>
          <button className="button button-quiet" type="button" onClick={logout}>退出 <Glyph name="logout" /></button>
        </div>
      </div>

      <form className="editor-form" onSubmit={saveProfile}>
        <section className="editor-panel">
          <div className="editor-panel-title"><span>01</span><div><h2>前台模块管理</h2><p>选择公开页面展示的内容模块。隐藏模块不会删除档案数据。</p></div></div>
          <div className="module-toggle-grid">
            {PROFILE_MODULES.map(({ key, label, description }) => (
              <label className={`module-toggle ${profile.modules[key] ? "is-enabled" : ""}`} key={key}>
                <span className="module-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
                <input type="checkbox" checked={profile.modules[key]} onChange={(event) => setModule(key, event.target.checked)} />
                <span className="module-toggle-track" aria-hidden="true"><i /></span>
              </label>
            ))}
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-panel-title"><span>02</span><div><h2>个人介绍</h2><p>首屏会展示姓名、方向与一句话介绍。</p></div></div>
          <div className="editor-fields editor-fields-two">
            <label className="field-label">姓名<input className="field-input" value={profile.displayName} onChange={(event) => setField("displayName", event.target.value)} maxLength={80} /></label>
            <label className="field-label">职位 / 专业方向<input className="field-input" value={profile.title} onChange={(event) => setField("title", event.target.value)} maxLength={120} /></label>
            <label className="field-label field-span-two">首页标题<input className="field-input" value={profile.headline} onChange={(event) => setField("headline", event.target.value)} maxLength={180} /></label>
            <label className="field-label field-span-two">个人介绍<textarea className="field-input field-textarea" value={profile.introduction} onChange={(event) => setField("introduction", event.target.value)} maxLength={1200} rows={4} /></label>
            <label className="field-label">所在地<input className="field-input" value={profile.location} onChange={(event) => setField("location", event.target.value)} maxLength={120} /></label>
            <label className="field-label">联系邮箱<input className="field-input" type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} maxLength={200} /></label>
            <label className="field-label">GitHub 链接<input className="field-input" type="url" placeholder="https://github.com/…" value={profile.githubUrl} onChange={(event) => setField("githubUrl", event.target.value)} /></label>
            <label className="field-label">简历 PDF 链接<input className="field-input" type="url" placeholder="https://…" value={profile.resumeUrl} onChange={(event) => setField("resumeUrl", event.target.value)} /></label>
            <label className="field-label field-span-two">技能标签 <span className="field-hint">每行一项</span><textarea className="field-input field-textarea" value={profile.skills.join("\n")} onChange={(event) => setField("skills", event.target.value.split("\n"))} rows={4} /></label>
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-panel-title"><span>03</span><div><h2>精选项目</h2><p>为每个项目添加简介、技能标签与可验证证据。</p></div></div>
          <div className="editor-items">
            {profile.projects.map((project, index) => (
              <article className="editor-item" key={project.id}>
                <div className="editor-item-top"><strong>项目 {String(index + 1).padStart(2, "0")}</strong><button className="icon-button danger-button" type="button" aria-label={`删除项目 ${index + 1}`} onClick={() => removeProject(index)}><Glyph name="trash" /></button></div>
                <div className="editor-fields editor-fields-two">
                  <label className="field-label">项目名称<input className="field-input" value={project.title} onChange={(event) => updateProject(index, "title", event.target.value)} maxLength={100} /></label>
                  <label className="field-label">证据链接文字<input className="field-input" value={project.evidenceLabel} onChange={(event) => updateProject(index, "evidenceLabel", event.target.value)} maxLength={80} /></label>
                  <label className="field-label field-span-two">项目简介<textarea className="field-input field-textarea" value={project.summary} onChange={(event) => updateProject(index, "summary", event.target.value)} maxLength={500} rows={3} /></label>
                  <label className="field-label">技能标签 <span className="field-hint">用顿号或逗号分隔</span><input className="field-input" value={project.tags.join("、")} onChange={(event) => updateProject(index, "tags", event.target.value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean))} /></label>
                  <label className="field-label">证据 URL<input className="field-input" type="url" placeholder="https://…" value={project.evidenceUrl.startsWith("#") ? "" : project.evidenceUrl} onChange={(event) => updateProject(index, "evidenceUrl", event.target.value)} /></label>
                </div>
              </article>
            ))}
          </div>
          <button className="button button-quiet add-item-button" type="button" onClick={addProject}><Glyph name="plus" /> 添加项目</button>
        </section>

        <section className="editor-panel">
          <div className="editor-panel-title"><span>04</span><div><h2>经历时间线</h2><p>工作经历和教育背景会分开展示在公开页面。</p></div></div>
          <div className="editor-items">
            {profile.milestones.map((milestone, index) => (
              <article className="editor-item" key={milestone.id}>
                <div className="editor-item-top"><strong>经历 {String(index + 1).padStart(2, "0")}</strong><button className="icon-button danger-button" type="button" aria-label={`删除经历 ${index + 1}`} onClick={() => removeMilestone(index)}><Glyph name="trash" /></button></div>
                <div className="editor-fields editor-fields-two">
                  <label className="field-label">时间段<input className="field-input" value={milestone.period} onChange={(event) => updateMilestone(index, "period", event.target.value)} maxLength={80} /></label>
                  <label className="field-label">经历类型<select className="field-input" value={milestone.kind} onChange={(event) => updateMilestone(index, "kind", event.target.value as PortfolioMilestone["kind"])}><option value="experience">工作经历</option><option value="education">教育经历</option></select></label>
                  <label className="field-label">职位 / 角色<input className="field-input" value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} maxLength={100} /></label>
                  <label className="field-label field-span-two">公司 / 学校 / 项目<input className="field-input" value={milestone.organization} onChange={(event) => updateMilestone(index, "organization", event.target.value)} maxLength={120} /></label>
                  <label className="field-label field-span-two">经历说明<textarea className="field-input field-textarea" value={milestone.summary} onChange={(event) => updateMilestone(index, "summary", event.target.value)} maxLength={500} rows={3} /></label>
                </div>
              </article>
            ))}
          </div>
          <button className="button button-quiet add-item-button" type="button" onClick={addMilestone}><Glyph name="plus" /> 添加经历</button>
        </section>

        <div className="editor-savebar">
          <div className="save-status">{error ? <span className="form-error" role="alert">{error}</span> : message ? <span className="form-success" role="status">{message}</span> : <span>演示内容仅作占位，可随时修改。</span>}</div>
          <button className="button button-dark" type="submit" disabled={busy}>{busy ? "正在保存…" : "保存档案"}<Glyph name="save" /></button>
        </div>
      </form>
    </section>
  );
}
