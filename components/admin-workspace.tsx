"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_PROFILE,
  PROFILE_MODULES,
  type PortfolioContentItem,
  type PortfolioMilestone,
  type PortfolioModuleKey,
  type PortfolioProfile,
} from "@/lib/profile";
import { Glyph } from "@/components/glyph";
import { ContentListEditor, type ContentField } from "@/components/content-list-editor";
import { VisitorRadar } from "@/components/visitor-radar";

type AdminPanelKey = "layout" | "content" | "radar";
type CollectionKey = "socialLinks" | "strengths" | "showcaseItems" | "projects" | "achievements" | "blogs" | "talks" | "podcasts" | "metrics" | "recommendations";

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

const socialFields: ContentField[] = [
  { key: "title", label: "平台名称", placeholder: "个人网站 / 知乎 / Gitee" },
  { key: "url", label: "链接地址", kind: "url", fullWidth: true },
];
const strengthFields: ContentField[] = [
  { key: "title", label: "擅长方向", placeholder: "前端工程化" },
  { key: "level", label: "熟练度（0–100）", kind: "number" },
];
const projectFields: ContentField[] = [
  { key: "title", label: "名称" },
  { key: "subtitle", label: "副标题" },
  { key: "summary", label: "内容介绍", kind: "textarea", fullWidth: true },
  { key: "imageUrl", label: "图片 URL", kind: "url", fullWidth: true },
  { key: "url", label: "主要链接", kind: "url" },
  { key: "urlLabel", label: "主要链接文字" },
  { key: "secondaryUrl", label: "补充链接", kind: "url" },
  { key: "secondaryLabel", label: "补充链接文字" },
  { key: "tags", label: "主题标签", kind: "tags", fullWidth: true },
];
const achievementFields: ContentField[] = [
  { key: "title", label: "奖项 / 证书名称" },
  { key: "period", label: "获得时间" },
  { key: "summary", label: "说明", kind: "textarea", fullWidth: true },
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
  { key: "title", label: "高光标题" },
  { key: "summary", label: "口径说明", kind: "textarea", fullWidth: true },
];
const recommendationFields: ContentField[] = [
  { key: "title", label: "评价人姓名" },
  { key: "organization", label: "职位 / 组织" },
  { key: "summary", label: "推荐语或评价", kind: "textarea", fullWidth: true },
  { key: "url", label: "身份链接", kind: "url", fullWidth: true },
];

export function AdminWorkspace({ onLogout }: { onLogout: () => Promise<void> }) {
  const [profile, setProfile] = useState<PortfolioProfile>(DEFAULT_PROFILE);
  const [activePanel, setActivePanel] = useState<AdminPanelKey>("layout");
  const [selectedModule, setSelectedModule] = useState<PortfolioModuleKey>("intro");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("暂时无法读取档案内容。");
        return await response.json() as PortfolioProfile;
      })
      .then((value) => { if (active) setProfile(value); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "读取档案失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setField<K extends keyof PortfolioProfile>(key: K, value: PortfolioProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function setModule(key: PortfolioModuleKey, visible: boolean) {
    if (key === "intro") return;
    setProfile((current) => ({ ...current, modules: { ...current.modules, [key]: visible } }));
  }

  function moveModule(key: PortfolioModuleKey, direction: -1 | 1) {
    if (key === "intro") return;
    setProfile((current) => {
      const order = [...current.moduleOrder];
      const index = order.indexOf(key);
      const nextIndex = index + direction;
      if (index < 1 || nextIndex < 1 || nextIndex >= order.length) return current;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...current, moduleOrder: order };
    });
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

  function addMilestone(kind: PortfolioMilestone["kind"]) {
    const titles = { experience: "职位 / 角色", education: "专业 / 学位", growth: "高光节点" };
    setProfile((current) => ({
      ...current,
      milestones: [...current.milestones, { id: crypto.randomUUID(), kind, period: "", title: titles[kind], organization: "", summary: "" }],
    }));
  }

  function removeMilestone(index: number) {
    setProfile((current) => ({ ...current, milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index) }));
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

  function milestoneEditor(kind: PortfolioMilestone["kind"], number: string, title: string, hint: string) {
    const items = profile.milestones.map((item, index) => ({ item, index })).filter(({ item }) => item.kind === kind);
    return (
      <section className="editor-panel">
        <div className="editor-panel-title"><span>{number}</span><div><h2>{title}</h2><p>{hint}</p></div></div>
        <div className="editor-items">
          {items.map(({ item: milestone, index }) => (
            <article className="editor-item" key={milestone.id}>
              <div className="editor-item-top"><strong>{milestone.title || title}</strong><button className="icon-button danger-button" type="button" aria-label={`删除${title}`} onClick={() => removeMilestone(index)}><Glyph name="trash" /></button></div>
              <div className="editor-fields editor-fields-two">
                <label className="field-label">时间段<input className="field-input" value={milestone.period} onChange={(event) => updateMilestone(index, "period", event.target.value)} maxLength={100} /></label>
                <label className="field-label">{kind === "education" ? "专业 / 学位" : kind === "experience" ? "职位 / 角色" : "节点标题"}<input className="field-input" value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} maxLength={140} /></label>
                <label className="field-label field-span-two">{kind === "education" ? "学校 / 组织" : kind === "experience" ? "公司 / 组织" : "相关组织"}<input className="field-input" value={milestone.organization} onChange={(event) => updateMilestone(index, "organization", event.target.value)} maxLength={160} /></label>
                <label className="field-label field-span-two">经历与成果<textarea className="field-input field-textarea" value={milestone.summary} onChange={(event) => updateMilestone(index, "summary", event.target.value)} maxLength={1200} rows={3} /></label>
              </div>
            </article>
          ))}
          {!items.length ? <p className="editor-empty-note">还没有添加内容。</p> : null}
        </div>
        <button className="button button-quiet add-item-button" type="button" onClick={() => addMilestone(kind)}><Glyph name="plus" /> 添加{title}</button>
      </section>
    );
  }

  function selectedModuleEditor() {
    switch (selectedModule) {
      case "intro":
        return (
          <section className="editor-panel">
            <div className="editor-panel-title"><span>01</span><div><h2>个人简介</h2><p>填写公开展示页的身份介绍和简历入口。</p></div></div>
            <div className="editor-fields editor-fields-two">
              <label className="field-label">姓名<input className="field-input" value={profile.displayName} onChange={(event) => setField("displayName", event.target.value)} maxLength={80} /></label>
              <label className="field-label">职业身份 / 专业领域<input className="field-input" value={profile.title} onChange={(event) => setField("title", event.target.value)} maxLength={140} /></label>
              <label className="field-label field-span-two">首页标题<input className="field-input" value={profile.headline} onChange={(event) => setField("headline", event.target.value)} maxLength={240} /></label>
              <label className="field-label field-span-two">个人介绍<textarea className="field-input field-textarea" value={profile.introduction} onChange={(event) => setField("introduction", event.target.value)} maxLength={1600} rows={4} /></label>
              <label className="field-label field-span-two">简历 PDF 链接<input className="field-input" type="url" placeholder="https://…" value={profile.resumeUrl} onChange={(event) => setField("resumeUrl", event.target.value)} /></label>
            </div>
          </section>
        );
      case "highlights":
        return <>{milestoneEditor("growth", "02", "高光节点", "补充值得重点呈现的经历节点。")}
          <ContentListEditor number="02" title="数据高光" hint="用关键数字展示成果，并补充统计口径。" items={profile.metrics} fields={metricFields} onChange={(items) => setCollection("metrics", items)} itemLabel="数据" addLabel="添加数据高光" /></>;
      case "showcase":
        return <ContentListEditor number="03" title="作品展示" hint="填写作品介绍、图片和可以直接访问的链接。" items={profile.showcaseItems} fields={projectFields} onChange={(items) => setCollection("showcaseItems", items)} itemLabel="作品" addLabel="添加作品" />;
      case "skills":
        return (
          <section className="editor-panel">
            <div className="editor-panel-title"><span>04</span><div><h2>技能</h2><p>每行填写一项技能或技术栈。</p></div></div>
            <label className="field-label">技能标签<textarea className="field-input field-textarea" value={profile.skills.join("\n")} onChange={(event) => setField("skills", event.target.value.split("\n"))} rows={7} /></label>
          </section>
        );
      case "strengths":
        return <ContentListEditor number="05" title="擅长领域" hint="列出长期实践的技术方向，并用项目经历支撑。" items={profile.strengths} fields={strengthFields} onChange={(items) => setCollection("strengths", items)} itemLabel="方向" addLabel="添加擅长方向" />;
      case "education":
        return milestoneEditor("education", "06", "学习经历", "填写学校、专业和学习阶段。");
      case "career":
        return milestoneEditor("experience", "07", "职业经历", "填写任职经历、职责范围和实际成果。");
      case "featuredProjects":
        return <ContentListEditor number="08" title="代表项目" hint="重点介绍项目背景、个人贡献和交付结果。" items={profile.projects} fields={projectFields} onChange={(items) => setCollection("projects", items)} itemLabel="项目" addLabel="添加代表项目" />;
      case "awards":
        return <ContentListEditor number="09" title="成就与证书" hint="添加奖项、证书、证明材料和证书图片。" items={profile.achievements} fields={achievementFields} onChange={(items) => setCollection("achievements", items)} itemLabel="成就" addLabel="添加成就 / 证书" />;
      case "blogs":
        return <ContentListEditor number="10" title="博客" hint="展示文章标题、摘要、标签和原文链接。" items={profile.blogs} fields={blogFields} onChange={(items) => setCollection("blogs", items)} itemLabel="文章" addLabel="添加文章" />;
      case "talks":
        return <ContentListEditor number="11" title="演讲" hint="填写演讲主题、活动信息、演讲链接和演示文稿。" items={profile.talks} fields={talkFields} onChange={(items) => setCollection("talks", items)} itemLabel="分享" addLabel="添加演讲" />;
      case "podcasts":
        return <ContentListEditor number="12" title="播客" hint="可填写节目介绍、收听链接或播放器嵌入地址。" items={profile.podcasts} fields={podcastFields} onChange={(items) => setCollection("podcasts", items)} itemLabel="节目" addLabel="添加播客节目" />;
      case "reviews":
        return <ContentListEditor number="13" title="推荐语 & 评价" hint="填写评价内容、评价人身份和可验证的身份链接。" items={profile.recommendations} fields={recommendationFields} onChange={(items) => setCollection("recommendations", items)} itemLabel="评价" addLabel="添加评价" />;
      case "contact":
        return <>
          <section className="editor-panel">
            <div className="editor-panel-title"><span>14</span><div><h2>联系方式</h2><p>填写访问者可以联系你的方式和公开账号。</p></div></div>
            <div className="editor-fields editor-fields-two">
              <label className="field-label">所在地<input className="field-input" value={profile.location} onChange={(event) => setField("location", event.target.value)} maxLength={160} /></label>
              <label className="field-label">联系邮箱<input className="field-input" type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} maxLength={200} /></label>
              <label className="field-label">联系电话<input className="field-input" value={profile.phone} onChange={(event) => setField("phone", event.target.value)} maxLength={100} /></label>
              <label className="field-label">GitHub 主页<input className="field-input" type="url" placeholder="https://github.com/…" value={profile.githubUrl} onChange={(event) => setField("githubUrl", event.target.value)} /></label>
              <label className="field-label">LinkedIn 主页<input className="field-input" type="url" placeholder="https://linkedin.com/in/…" value={profile.linkedinUrl} onChange={(event) => setField("linkedinUrl", event.target.value)} /></label>
              <label className="field-label">X 用户名<input className="field-input" placeholder="不需要输入 @" value={profile.twitterHandle} onChange={(event) => setField("twitterHandle", event.target.value)} maxLength={80} /></label>
            </div>
          </section>
          <ContentListEditor number="14" title="其他社交链接" hint="添加其他个人主页或社交账号。" items={profile.socialLinks} fields={socialFields} onChange={(items) => setCollection("socialLinks", items)} itemLabel="链接" addLabel="添加社交链接" />
        </>;
    }
  }

  if (loading) return <section className="admin-loading"><span className="loading-spinner" />正在读取档案…</section>;

  const selectedModuleDefinition = PROFILE_MODULES.find(({ key }) => key === selectedModule);
  const adminPanels: Array<{ key: AdminPanelKey; number: string; label: string; description: string }> = [
    { key: "layout", number: "01", label: "布局调整", description: "模块顺序与显示状态" },
    { key: "content", number: "02", label: "内容设置", description: "编辑展示页内容" },
    { key: "radar", number: "03", label: "访问雷达", description: "全部访客记录与投递归因" },
  ];

  return (
    <section className="editor-layout">
      <div className="editor-heading">
        <div>
          <p className="section-kicker">ECKYSTUDIO / OFFERFOLIO</p>
          <h1>主页管理</h1>
          <p>调整展示布局、编辑内容并查看公开页面访问情况。</p>
        </div>
        <div className="editor-heading-actions">
          <a className="button button-quiet" href="/" target="_blank" rel="noreferrer">预览公开页面 <Glyph name="arrow" /></a>
          <button className="button button-quiet" type="button" onClick={onLogout}>退出 <Glyph name="logout" /></button>
        </div>
      </div>

      <div className="admin-workspace">
        <nav className="admin-sidebar" aria-label="管理导航">
          <p className="admin-sidebar-label">管理菜单</p>
          {adminPanels.map((panel) => (
            <button key={panel.key} type="button" className={`admin-sidebar-item ${activePanel === panel.key ? "is-active" : ""}`} onClick={() => { setActivePanel(panel.key); setError(""); setMessage(""); }} aria-current={activePanel === panel.key ? "page" : undefined}>
              <span className="admin-sidebar-number">{panel.number}</span>
              <span><strong>{panel.label}</strong><small>{panel.description}</small></span>
              <span className="admin-sidebar-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </nav>

        <div className="admin-workspace-main">
          {activePanel === "radar" ? <VisitorRadar /> : (
            <form className="editor-form" onSubmit={saveProfile}>
              {activePanel === "layout" ? (
                <section className="editor-panel layout-panel">
                  <div className="editor-panel-title"><span>01</span><div><h2>展示模块布局</h2><p>简介固定在首位，其余模块可调整顺序和显示状态。</p></div></div>
                  <ol className="layout-module-list">
                    {profile.moduleOrder.map((key, index) => {
                      const module = PROFILE_MODULES.find((item) => item.key === key);
                      if (!module) return null;
                      const fixed = key === "intro";
                      return (
                        <li className={`layout-module-row ${fixed ? "is-fixed" : ""}`} key={key}>
                          <span className="layout-module-index">{String(index + 1).padStart(2, "0")}</span>
                          <div className="layout-module-copy"><strong>{module.label}</strong><small>{module.description}</small></div>
                          <label className="layout-module-visibility"><span>{fixed ? "固定显示" : profile.modules[key] ? "显示" : "隐藏"}</span><input type="checkbox" checked={fixed || profile.modules[key]} disabled={fixed} onChange={(event) => setModule(key, event.target.checked)} aria-label={`${profile.modules[key] ? "隐藏" : "显示"}${module.label}`} /></label>
                          <div className="layout-module-order"><button type="button" disabled={fixed || index === 1} aria-label={`上移${module.label}`} onClick={() => moveModule(key, -1)}>↑</button><button type="button" disabled={fixed || index === profile.moduleOrder.length - 1} aria-label={`下移${module.label}`} onClick={() => moveModule(key, 1)}>↓</button></div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : (
                <section className="content-settings-panel">
                  <div className="editor-panel content-picker-panel">
                    <div className="editor-panel-title"><span>02</span><div><h2>选择内容模块</h2><p>选择右侧模块后，编辑对应内容。</p></div></div>
                    <div className="content-module-picker">
                      {PROFILE_MODULES.map(({ key, label }) => (
                        <button className={`content-module-option ${selectedModule === key ? "is-selected" : ""} ${!profile.modules[key] ? "is-hidden" : ""}`} key={key} type="button" onClick={() => setSelectedModule(key)} aria-pressed={selectedModule === key}>
                          <span>{label}</span><small>{key === "intro" ? "固定" : profile.modules[key] ? "展示中" : "已隐藏"}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="selected-module-heading"><div><p className="section-kicker">内容模块</p><h2>{selectedModuleDefinition?.label}</h2></div>{selectedModule !== "intro" && !profile.modules[selectedModule] ? <span className="module-hidden-badge">当前模块已隐藏</span> : null}</div>
                  <div className="selected-module-editor">{selectedModuleEditor()}</div>
                </section>
              )}

              <div className="editor-savebar">
                <div className="save-status">{error ? <span className="form-error" role="alert">{error}</span> : message ? <span className="form-success" role="status">{message}</span> : <span>保存后同步更新公开展示页。</span>}</div>
                <button className="button button-dark" type="submit" disabled={busy}>{busy ? "正在保存…" : "保存更改"}<Glyph name="save" /></button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
