"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Glyph } from "@/components/glyph";
import { adminFetch } from "@/components/admin-fetch";
import type { PortfolioContentItem, PortfolioMilestone } from "@/lib/profile";

type Props = {
  items: PortfolioContentItem[];
  experiences: PortfolioMilestone[];
  onChange: (items: PortfolioContentItem[]) => void;
};

const PERSONAL_PROJECT = "__personal_or_open_source__";
const LEGACY_ORGANIZATION = "__legacy_organization__";

function blankProject(): PortfolioContentItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    subtitle: "",
    summary: "",
    organization: "",
    careerExperienceId: "",
    role: "",
    period: "",
    url: "",
    urlLabel: "查看详情",
    secondaryUrl: "",
    secondaryLabel: "",
    imageUrl: "",
    embedUrl: "",
    language: "",
    tags: [],
    value: "",
    level: 0,
    stars: 0,
    forks: 0,
  };
}

function tagsFromInput(value: string) {
  return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
}

function experienceLabel(experience: PortfolioMilestone) {
  return [experience.period, experience.title, experience.organization].filter(Boolean).join(" · ");
}

function linkedExperience(item: PortfolioContentItem, experiences: PortfolioMilestone[]) {
  return experiences.find((experience) => experience.id === item.careerExperienceId)
    ?? (item.organization ? experiences.find((experience) => experience.organization.trim() === item.organization.trim()) : undefined);
}

function shownOrganization(item: PortfolioContentItem, experiences: PortfolioMilestone[]) {
  return linkedExperience(item, experiences)?.organization || item.organization;
}

export function ProjectListEditor({ items, experiences, onChange }: Props) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  function update(id: string, patch: Partial<PortfolioContentItem>) {
    onChange(itemsRef.current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addProject() {
    const project = blankProject();
    onChange([...itemsRef.current, project]);
    setExpandedIds((current) => [...current, project.id]);
  }

  function removeProject(id: string) {
    onChange(itemsRef.current.filter((item) => item.id !== id));
    setExpandedIds((current) => current.filter((itemId) => itemId !== id));
  }

  function moveProject(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= itemsRef.current.length) return;
    const next = [...itemsRef.current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  function toggleProject(id: string) {
    setExpandedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  function changeExperience(item: PortfolioContentItem, value: string) {
    if (value === LEGACY_ORGANIZATION) return;
    if (value === PERSONAL_PROJECT) {
      update(item.id, { careerExperienceId: "", organization: "个人 / 开源项目" });
      return;
    }
    const experience = experiences.find((candidate) => candidate.id === value);
    update(item.id, {
      careerExperienceId: experience?.id ?? "",
      organization: experience?.organization ?? "",
    });
  }

  function experienceValue(item: PortfolioContentItem) {
    const linked = linkedExperience(item, experiences);
    if (linked) return linked.id;
    if (item.organization === "个人 / 开源项目") return PERSONAL_PROJECT;
    return item.organization ? LEGACY_ORGANIZATION : "";
  }

  async function uploadImage(id: string, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading((current) => ({ ...current, [id]: true }));
    setUploadErrors((current) => ({ ...current, [id]: "" }));
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await adminFetch("/api/admin/projects/image", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "项目图片上传失败，请重试。");
      update(id, { imageUrl: result.url });
    } catch (caught) {
      setUploadErrors((current) => ({ ...current, [id]: caught instanceof Error ? caught.message : "项目图片上传失败，请重试。" }));
    } finally {
      setUploading((current) => ({ ...current, [id]: false }));
      input.value = "";
    }
  }

  return (
    <section className="editor-panel project-manager">
      <div className="editor-panel-title"><span>08</span><div><h2>代表项目</h2><p>项目名称、时间、所属单位和承担角色会作为主要信息展示。</p></div></div>
      <div className="project-list-toolbar"><strong>项目列表 <small>{items.length} 个项目</small></strong><span>使用右侧箭头调整展示顺序</span></div>
      <div className="project-list-hint">每个项目默认收起。图片和项目证明链接放在“展示素材与证明”中，避免表单一次铺开太多内容。</div>
      <div className="project-list">
        {items.map((item, index) => {
          const expanded = expandedIds.includes(item.id);
          const organization = shownOrganization(item, experiences);
          const metadata = [item.period, organization].filter(Boolean).join(" · ");
          const selectedExperience = experienceValue(item);
          const legacyLabel = item.organization ? `现有单位：${item.organization}（未关联职业经历）` : "现有单位（未关联职业经历）";
          const proofCount = Number(Boolean(item.url)) + Number(Boolean(item.secondaryUrl));

          return (
            <article className={`project-config-card${expanded ? " is-expanded" : ""}`} key={item.id}>
              <div className="project-config-header">
                <button className="project-config-toggle" type="button" onClick={() => toggleProject(item.id)} aria-expanded={expanded}>
                  <span className="project-config-number">{String(index + 1).padStart(2, "0")}</span>
                  {item.imageUrl ? <img className="project-config-thumb" src={item.imageUrl} alt="" /> : <span className="project-config-thumb project-config-thumb-empty">{item.title.trim().slice(0, 1) || "作"}</span>}
                  <span className="project-config-summary">
                    <strong>{item.title.trim() || "未命名项目"}</strong>
                    <small>{metadata || "尚未填写项目时间和所属单位"}</small>
                    {item.role ? <small className="project-config-role">项目角色 · {item.role}</small> : null}
                  </span>
                  <span className="project-config-tags">{item.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</span>
                  <span className="project-config-count">{item.imageUrl ? "1 张图片" : "暂无图片"} · {proofCount} 个链接</span>
                  <span className="project-config-chevron" aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
                </button>
                <div className="project-config-actions">
                  <button className="icon-button" type="button" aria-label={`上移项目 ${index + 1}`} title="上移" onClick={() => moveProject(index, -1)} disabled={index === 0}>↑</button>
                  <button className="icon-button" type="button" aria-label={`下移项目 ${index + 1}`} title="下移" onClick={() => moveProject(index, 1)} disabled={index === items.length - 1}>↓</button>
                  <button className="icon-button danger-button" type="button" aria-label={`删除项目 ${index + 1}`} title="删除项目" onClick={() => removeProject(item.id)}><Glyph name="trash" /></button>
                </div>
              </div>
              {expanded ? (
                <div className="project-config-body">
                  <div className="project-config-section-label">项目信息</div>
                  <div className="editor-fields project-core-fields">
                    <label className="field-label">项目名称<input className="field-input" value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} maxLength={140} /></label>
                    <label className="field-label">项目时间<input className="field-input" placeholder="如：2024.03 — 2025.06" value={item.period} onChange={(event) => update(item.id, { period: event.target.value })} maxLength={100} /></label>
                    <label className="field-label">关联职业经历<select className="field-input" value={selectedExperience} onChange={(event) => changeExperience(item, event.target.value)}>
                      <option value="">选择职业经历…</option>
                      {selectedExperience === LEGACY_ORGANIZATION ? <option value={LEGACY_ORGANIZATION}>{legacyLabel}</option> : null}
                      {experiences.map((experience) => <option value={experience.id} key={experience.id}>{experienceLabel(experience)}</option>)}
                      <option value={PERSONAL_PROJECT}>个人 / 开源项目（不关联公司）</option>
                    </select></label>
                    <label className="field-label">项目角色<input className="field-input" placeholder="如：项目负责人 / 核心开发" value={item.role ?? ""} onChange={(event) => update(item.id, { role: event.target.value })} maxLength={120} /></label>
                  </div>
                  <label className="field-label project-description-field">项目介绍<textarea className="field-input field-textarea" rows={4} value={item.summary} onChange={(event) => update(item.id, { summary: event.target.value })} maxLength={1200} placeholder="介绍项目背景、关键方案与交付结果；职责填写在项目角色中。" /></label>
                  <label className="field-label project-tags-field">主题标签<input className="field-input" value={item.tags.join("、")} onChange={(event) => update(item.id, { tags: tagsFromInput(event.target.value) })} placeholder="用顿号或逗号分隔，例如：问题拆解、方案设计" /></label>

                  <details className="project-materials">
                    <summary>展示素材与证明 <small>{item.imageUrl ? "1 张图片" : "暂无图片"} · {proofCount} 个链接</small></summary>
                    <div className="project-materials-body">
                      <div className="project-image-field">
                        <span className="project-image-label">项目图片</span>
                        <div className="project-image-controls">
                          {item.imageUrl ? <img className="content-image-preview" src={item.imageUrl} alt={`${item.title || "项目"}图片预览`} /> : <div className="content-image-placeholder">尚未上传图片</div>}
                          <label className="button button-quiet content-image-upload-button">
                            {uploading[item.id] ? "正在上传…" : item.imageUrl ? "更换图片" : "上传图片"}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => void uploadImage(item.id, event)} disabled={uploading[item.id]} />
                          </label>
                        </div>
                        <small className="project-image-note">选择本机图片后上传，保存档案后同步到公开页面。</small>
                        {uploadErrors[item.id] ? <span className="form-error" role="alert">{uploadErrors[item.id]}</span> : null}
                      </div>
                      <div className="project-links-fields">
                        <div className="project-links-heading">项目链接</div>
                        <div className="editor-fields editor-fields-two">
                          <label className="field-label">主要链接<input className="field-input" type="url" value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="https://…" /></label>
                          <label className="field-label">链接文字<input className="field-input" value={item.urlLabel} onChange={(event) => update(item.id, { urlLabel: event.target.value })} placeholder="查看详情" maxLength={100} /></label>
                          <label className="field-label">补充链接<input className="field-input" type="url" value={item.secondaryUrl} onChange={(event) => update(item.id, { secondaryUrl: event.target.value })} placeholder="https://…" /></label>
                          <label className="field-label">链接文字<input className="field-input" value={item.secondaryLabel} onChange={(event) => update(item.id, { secondaryLabel: event.target.value })} placeholder="了解更多" maxLength={100} /></label>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              ) : null}
            </article>
          );
        })}
        {!items.length ? <p className="editor-empty-note">还没有添加代表项目。</p> : null}
      </div>
      <button className="button button-quiet add-item-button" type="button" onClick={addProject} disabled={items.length >= 30}><Glyph name="plus" /> {items.length >= 30 ? "最多 30 个项目" : "添加代表项目"}</button>
    </section>
  );
}
