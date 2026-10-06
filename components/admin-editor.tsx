"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DEFAULT_PROFILE, PROFILE_MODULES, type PortfolioContentItem, type PortfolioMilestone, type PortfolioModuleKey, type PortfolioProfile } from "@/lib/profile";
import { Glyph } from "@/components/glyph";
import { ContentListEditor, type ContentField } from "@/components/content-list-editor";

type EditorMode = "checking" | "login" | "editing";
type CollectionKey = "socialLinks" | "skillProgress" | "openSourceProjects" | "projects" | "achievements" | "blogs" | "talks" | "podcasts" | "metrics" | "recommendations";

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

const socialFields: ContentField[] = [
  { key: "title", label: "平台名称", placeholder: "GitHub / LinkedIn / 个人网站" },
  { key: "url", label: "链接地址", kind: "url", fullWidth: true },
];
const skillProgressFields: ContentField[] = [
  { key: "title", label: "技术方向", placeholder: "前端开发" },
  { key: "level", label: "熟练度（0–100）", kind: "number" },
];
const openSourceFields: ContentField[] = [
  { key: "title", label: "仓库名称" },
  { key: "language", label: "主要语言" },
  { key: "summary", label: "仓库简介", kind: "textarea", fullWidth: true },
  { key: "url", label: "GitHub 仓库地址", kind: "url", fullWidth: true },
  { key: "stars", label: "Stars", kind: "number" },
  { key: "forks", label: "Forks", kind: "number" },
  { key: "tags", label: "主题标签", kind: "tags", fullWidth: true },
];
const projectFields: ContentField[] = [
  { key: "title", label: "项目名称" },
  { key: "subtitle", label: "项目副标题" },
  { key: "summary", label: "项目介绍", kind: "textarea", fullWidth: true },
  { key: "imageUrl", label: "项目图片 URL", kind: "url", fullWidth: true },
  { key: "url", label: "主要链接", kind: "url" },
  { key: "urlLabel", label: "主要链接文字" },
  { key: "secondaryUrl", label: "补充链接", kind: "url" },
  { key: "secondaryLabel", label: "补充链接文字" },
  { key: "tags", label: "项目标签", kind: "tags", fullWidth: true },
];
const achievementFields: ContentField[] = [
  { key: "title", label: "奖项 / 证书名称" },
  { key: "period", label: "获得时间" },
  { key: "summary", label: "成就说明", kind: "textarea", fullWidth: true },
  { key: "imageUrl", label: "证书图片 URL", kind: "url", fullWidth: true },
  { key: "url", label: "证明材料链接", kind: "url" },
  { key: "urlLabel", label: "链接文字" },
];
const blogFields: ContentField[] = [
  { key: "title", label: "文章标题" },
  { key: "period", label: "发布时间" },
  { key: "summary", label: "文章摘要", kind: "textarea", fullWidth: true },
  { key: "url", label: "文章链接", kind: "url" },
  { key: "urlLabel", label: "链接文字" },
  { key: "tags", label: "文章标签", kind: "tags", fullWidth: true },
];
const talkFields: ContentField[] = [
  { key: "title", label: "演讲主题" },
  { key: "organization", label: "活动 / 组织" },
  { key: "period", label: "活动时间" },
  { key: "summary", label: "演讲简介", kind: "textarea", fullWidth: true },
  { key: "url", label: "演讲视频 / 活动链接", kind: "url" },
  { key: "urlLabel", label: "主链接文字" },
  { key: "secondaryUrl", label: "演示文稿链接", kind: "url" },
  { key: "secondaryLabel", label: "演示文稿文字" },
];
const podcastFields: ContentField[] = [
  { key: "title", label: "节目名称" },
  { key: "summary", label: "节目介绍", kind: "textarea", fullWidth: true },
  { key: "url", label: "收听链接", kind: "url" },
  { key: "urlLabel", label: "链接文字" },
  { key: "embedUrl", label: "播放器嵌入地址", kind: "url", fullWidth: true },
];
const metricFields: ContentField[] = [
  { key: "value", label: "数据 / 数字", placeholder: "例如：30%" },
  { key: "title", label: "数据标题" },
  { key: "summary", label: "口径说明", kind: "textarea", fullWidth: true },
];
const recommendationFields: ContentField[] = [
  { key: "title", label: "推荐人姓名" },
  { key: "organization", label: "职位 / 组织" },
  { key: "summary", label: "推荐语", kind: "textarea", fullWidth: true },
  { key: "url", label: "推荐人身份链接", kind: "url", fullWidth: true },
];

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
          setError("连接服务失败，请稍后刷新页面。");
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

  function setModule(key: PortfolioModuleKey, visible: boolean) {
    setProfile((current) => ({ ...current, modules: { ...current.modules, [key]: visible } }));
  }

  function setCollection(key: CollectionKey, items: PortfolioContentItem[]) {
    setProfile((current) => ({ ...current, [key]: items }));
  }

  function updateMilestone<K extends keyof PortfolioMilestone>(index: number, key: K, value: PortfolioMilestone[K]) {
    setProfile((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, milestoneIndex) => milestoneIndex === index ? { ...milestone, [key]: value } : milestone),
    }));
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
      setMessage("已安全登录。档案内容将保存到本机 SQLite 数据库。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请重试。");
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
      if (!response.ok) throw new Error((result as PortfolioProfile & { error?: string }).error || "保存失败，请重试。");
      setProfile(result);
      setMessage("档案已保存，公开页面已同步更新。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMode("login");
    setMessage("已退出管理后台。");
  }

  function addMilestone(kind: PortfolioMilestone["kind"]) {
    const titles = { experience: "职位 / 角色", education: "专业 / 学位", growth: "成长节点" };
    setProfile((current) => ({
      ...current,
      milestones: [...current.milestones, { id: crypto.randomUUID(), kind, period: "", title: titles[kind], organization: "", summary: "" }],
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
          <p>在这里编辑个人主页。板块、技能、项目、文章、奖项和经历保存在本机 SQLite 数据库，不必重新构建站点。</p>
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
          <h1>主页管理</h1>
          <p>按 DeveloperFolio 的内容结构编辑中文主页。隐藏模块不会删除对应内容。</p>
        </div>
        <div className="editor-heading-actions">
          <a className="button button-quiet" href="/" target="_blank" rel="noreferrer">预览公开页面 <Glyph name="arrow" /></a>
          <button className="button button-quiet" type="button" onClick={logout}>退出 <Glyph name="logout" /></button>
        </div>
      </div>

      <form className="editor-form" onSubmit={saveProfile}>
        <section className="editor-panel">
          <div className="editor-panel-title"><span>01</span><div><h2>前台模块管理</h2><p>选择要展示的内容。头部、导航和页脚会随模块状态同步调整。</p></div></div>
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
          <div className="editor-panel-title"><span>02</span><div><h2>问候与自我介绍</h2><p>首屏标题、个人方向、简介和求职状态。</p></div></div>
          <div className="editor-fields editor-fields-two">
            <label className="field-label">姓名<input className="field-input" value={profile.displayName} onChange={(event) => setField("displayName", event.target.value)} maxLength={80} /></label>
            <label className="field-label">职业 / 专业方向<input className="field-input" value={profile.title} onChange={(event) => setField("title", event.target.value)} maxLength={140} /></label>
            <label className="field-label field-span-two">首页问候标题<input className="field-input" value={profile.headline} onChange={(event) => setField("headline", event.target.value)} maxLength={240} /></label>
            <label className="field-label field-span-two">个人简介<textarea className="field-input field-textarea" value={profile.introduction} onChange={(event) => setField("introduction", event.target.value)} maxLength={1600} rows={4} /></label>
            <label className="module-inline-check"><input type="checkbox" checked={profile.isHireable} onChange={(event) => setField("isHireable", event.target.checked)} /><span>显示“正在寻找新机会”状态</span></label>
          </div>
        </section>

        <ContentListEditor number="03" title="社交链接" hint="可在首页问候区显示社交账号入口。" items={profile.socialLinks} fields={socialFields} onChange={(items) => setCollection("socialLinks", items)} itemLabel="链接" addLabel="添加社交链接" />

        <section className="editor-panel">
          <div className="editor-panel-title"><span>04</span><div><h2>技能矩阵</h2><p>每行一个技能，会以图标标签形式展示。</p></div></div>
          <label className="field-label">技能标签<textarea className="field-input field-textarea" value={profile.skills.join("\n")} onChange={(event) => setField("skills", event.target.value.split("\n"))} rows={5} /></label>
        </section>

        <ContentListEditor number="05" title="技能熟练度" hint="填写技术领域和进度数值（0–100）。" items={profile.skillProgress} fields={skillProgressFields} onChange={(items) => setCollection("skillProgress", items)} itemLabel="方向" addLabel="添加技术方向" />

        <section className="editor-panel">
          <div className="editor-panel-title"><span>06</span><div><h2>教育、工作与成长时间线</h2><p>前台会按类型显示到对应板块；成长节点进入独立时间线。</p></div></div>
          <div className="editor-items">
            {profile.milestones.map((milestone, index) => (
              <article className="editor-item" key={milestone.id}>
                <div className="editor-item-top"><strong>经历 {String(index + 1).padStart(2, "0")}</strong><button className="icon-button danger-button" type="button" aria-label={`删除经历 ${index + 1}`} onClick={() => removeMilestone(index)}><Glyph name="trash" /></button></div>
                <div className="editor-fields editor-fields-two">
                  <label className="field-label">经历类型<select className="field-input" value={milestone.kind} onChange={(event) => updateMilestone(index, "kind", event.target.value as PortfolioMilestone["kind"])}><option value="experience">工作经历</option><option value="education">教育背景</option><option value="growth">成长节点</option></select></label>
                  <label className="field-label">时间段<input className="field-input" value={milestone.period} onChange={(event) => updateMilestone(index, "period", event.target.value)} maxLength={100} /></label>
                  <label className="field-label">职位 / 专业 / 节点<input className="field-input" value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} maxLength={140} /></label>
                  <label className="field-label">公司 / 学校 / 组织<input className="field-input" value={milestone.organization} onChange={(event) => updateMilestone(index, "organization", event.target.value)} maxLength={160} /></label>
                  <label className="field-label field-span-two">说明<textarea className="field-input field-textarea" value={milestone.summary} onChange={(event) => updateMilestone(index, "summary", event.target.value)} maxLength={1200} rows={3} /></label>
                </div>
              </article>
            ))}
          </div>
          <div className="milestone-add-actions"><button className="button button-quiet" type="button" onClick={() => addMilestone("experience")}><Glyph name="plus" /> 添加工作经历</button><button className="button button-quiet" type="button" onClick={() => addMilestone("education")}><Glyph name="plus" /> 添加教育背景</button><button className="button button-quiet" type="button" onClick={() => addMilestone("growth")}><Glyph name="plus" /> 添加成长节点</button></div>
        </section>

        <ContentListEditor number="07" title="开源项目" hint="仓库卡片包含简介、语言、主题和 GitHub 数据。也可以填写主页上手动维护的仓库信息。" items={profile.openSourceProjects} fields={openSourceFields} onChange={(items) => setCollection("openSourceProjects", items)} itemLabel="仓库" addLabel="添加开源仓库" />
        <ContentListEditor number="08" title="精选项目" hint="重点项目卡片支持图片、项目描述和两个外部链接。" items={profile.projects} fields={projectFields} onChange={(items) => setCollection("projects", items)} itemLabel="项目" addLabel="添加精选项目" />
        <ContentListEditor number="09" title="成就与证书" hint="添加奖项、证书、证明材料和证书图片。" items={profile.achievements} fields={achievementFields} onChange={(items) => setCollection("achievements", items)} itemLabel="成就" addLabel="添加成就 / 证书" />
        <ContentListEditor number="10" title="博客文章" hint="展示文章标题、摘要、标签和原文链接。" items={profile.blogs} fields={blogFields} onChange={(items) => setCollection("blogs", items)} itemLabel="文章" addLabel="添加文章" />
        <ContentListEditor number="11" title="演讲与分享" hint="填写主题、活动信息、演讲链接和演示文稿。" items={profile.talks} fields={talkFields} onChange={(items) => setCollection("talks", items)} itemLabel="分享" addLabel="添加演讲 / 分享" />

        <section className="editor-panel">
          <div className="editor-panel-title"><span>12</span><div><h2>Twitter / X</h2><p>填写用户名后，前台显示社交主页入口。</p></div></div>
          <label className="field-label">用户名<input className="field-input" placeholder="不需要输入 @" value={profile.twitterHandle} onChange={(event) => setField("twitterHandle", event.target.value)} maxLength={80} /></label>
        </section>

        <ContentListEditor number="13" title="播客" hint="可使用公开的播客收听地址，或嵌入播放器地址。" items={profile.podcasts} fields={podcastFields} onChange={(items) => setCollection("podcasts", items)} itemLabel="节目" addLabel="添加播客节目" />
        <ContentListEditor number="14" title="数据亮点" hint="为数字补充统计口径或结果背景，避免孤立数字。" items={profile.metrics} fields={metricFields} onChange={(items) => setCollection("metrics", items)} itemLabel="数据" addLabel="添加数据亮点" />
        <ContentListEditor number="15" title="推荐语" hint="展示推荐内容、推荐人身份和可验证的身份链接。" items={profile.recommendations} fields={recommendationFields} onChange={(items) => setCollection("recommendations", items)} itemLabel="推荐" addLabel="添加推荐语" />

        <section className="editor-panel">
          <div className="editor-panel-title"><span>16</span><div><h2>联系、社交与简历</h2><p>填写基本联系方式、GitHub 信息和简历 PDF 链接。</p></div></div>
          <div className="editor-fields editor-fields-two">
            <label className="field-label">所在地<input className="field-input" value={profile.location} onChange={(event) => setField("location", event.target.value)} maxLength={160} /></label>
            <label className="field-label">联系邮箱<input className="field-input" type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} maxLength={200} /></label>
            <label className="field-label">联系电话<input className="field-input" value={profile.phone} onChange={(event) => setField("phone", event.target.value)} maxLength={100} /></label>
            <label className="field-label">GitHub 主页<input className="field-input" type="url" placeholder="https://github.com/…" value={profile.githubUrl} onChange={(event) => setField("githubUrl", event.target.value)} /></label>
            <label className="field-label">LinkedIn 主页<input className="field-input" type="url" placeholder="https://linkedin.com/in/…" value={profile.linkedinUrl} onChange={(event) => setField("linkedinUrl", event.target.value)} /></label>
            <label className="field-label">简历 PDF 链接<input className="field-input" type="url" placeholder="https://…" value={profile.resumeUrl} onChange={(event) => setField("resumeUrl", event.target.value)} /></label>
          </div>
        </section>

        <div className="editor-savebar">
          <div className="save-status">{error ? <span className="form-error" role="alert">{error}</span> : message ? <span className="form-success" role="status">{message}</span> : <span>所有修改保存后同步到公开页面。</span>}</div>
          <button className="button button-dark" type="submit" disabled={busy}>{busy ? "正在保存…" : "保存档案"}<Glyph name="save" /></button>
        </div>
      </form>
    </section>
  );
}
