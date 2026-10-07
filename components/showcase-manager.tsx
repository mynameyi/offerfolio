"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Glyph } from "@/components/glyph";
import type { PortfolioContentItem } from "@/lib/profile";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v";
type ShowcaseType = "open-source" | "confidential";
type UploadResult = { url: string; kind: "image" | "video"; error?: string };

function emptyItem(type: ShowcaseType): PortfolioContentItem {
  return {
    id: crypto.randomUUID(),
    showcaseType: type,
    title: "",
    subtitle: "",
    summary: "",
    organization: "",
    period: "",
    url: "",
    urlLabel: "查看源码",
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

export function ShowcaseManager({ items, onChange }: { items: PortfolioContentItem[]; onChange: (items: PortfolioContentItem[]) => void }) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  function update(id: string, changes: Partial<PortfolioContentItem>) {
    onChange(items.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function addItem(type: ShowcaseType) {
    if (items.length >= 30) return;
    onChange([...items, emptyItem(type)]);
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  async function upload(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploading((current) => ({ ...current, [id]: true }));
    setError((current) => ({ ...current, [id]: "" }));
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/showcase/media", { method: "POST", body: formData });
      const result = await response.json() as UploadResult;
      if (!response.ok) throw new Error(result.error || "上传失败，请重试。");
      update(id, result.kind === "image" ? { imageUrl: result.url, embedUrl: "" } : { imageUrl: "", embedUrl: result.url });
    } catch (caught) {
      setError((current) => ({ ...current, [id]: caught instanceof Error ? caught.message : "上传失败，请重试。" }));
    } finally {
      setUploading((current) => ({ ...current, [id]: false }));
    }
  }

  return (
    <section className="editor-panel showcase-manager">
      <div className="editor-panel-title"><span>03</span><div><h2>作品展示</h2><p>开源作品只需填写源码链接；保密作品上传图片或视频并添加介绍。</p></div></div>
      <div className="editor-items">
        {items.map((item, index) => {
          const type = item.showcaseType ?? (item.imageUrl || item.embedUrl ? "confidential" : "open-source");
          return (
            <article className="editor-item showcase-editor-item" key={item.id}>
              <div className="editor-item-top">
                <strong>作品 {String(index + 1).padStart(2, "0")}</strong>
                <div className="showcase-item-actions">
                  <select className="field-input showcase-type-select" aria-label={`作品 ${index + 1} 类型`} value={type} onChange={(event) => update(item.id, { showcaseType: event.target.value as ShowcaseType })}>
                    <option value="open-source">开源作品</option>
                    <option value="confidential">保密作品</option>
                  </select>
                  <button className="icon-button danger-button" type="button" aria-label={`删除作品 ${index + 1}`} onClick={() => removeItem(item.id)}><Glyph name="trash" /></button>
                </div>
              </div>

              {type === "open-source" ? (
                <label className="field-label" htmlFor={`${item.id}-repository`}>源码链接
                  <input id={`${item.id}-repository`} className="field-input" type="url" value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="https://github.com/用户名/仓库名" />
                </label>
              ) : (
                <div className="showcase-confidential-fields">
                  <div className="field-label">图片或视频
                    {item.imageUrl || item.embedUrl ? (
                      <div className="showcase-media-preview">
                        {item.imageUrl ? <img src={item.imageUrl} alt="作品预览" /> : <video src={item.embedUrl} controls preload="metadata" />}
                        <button className="button button-quiet" type="button" onClick={() => inputs.current[item.id]?.click()}>{uploading[item.id] ? "正在上传…" : "更换文件"}</button>
                      </div>
                    ) : (
                      <button className="showcase-upload-button" type="button" onClick={() => inputs.current[item.id]?.click()} disabled={uploading[item.id]}>
                        <Glyph name="plus" />{uploading[item.id] ? "正在上传…" : "选择图片或视频"}
                      </button>
                    )}
                    <input ref={(element) => { inputs.current[item.id] = element; }} className="showcase-hidden-file" type="file" accept={ACCEPTED_MEDIA} onChange={(event) => void upload(item.id, event)} aria-label="上传作品图片或视频" />
                    {error[item.id] ? <span className="showcase-upload-error" role="alert">{error[item.id]}</span> : null}
                  </div>
                  <label className="field-label">描述介绍
                    <textarea className="field-input field-textarea" rows={3} value={item.summary} onChange={(event) => update(item.id, { summary: event.target.value })} placeholder="介绍作品背景、作用或值得关注的成果" />
                  </label>
                </div>
              )}
            </article>
          );
        })}
        {!items.length ? <p className="editor-empty-note">还没有添加作品。</p> : null}
      </div>
      <div className="showcase-add-actions">
        <button className="button button-quiet" type="button" onClick={() => addItem("open-source")} disabled={items.length >= 30}><Glyph name="plus" />添加开源作品</button>
        <button className="button button-quiet" type="button" onClick={() => addItem("confidential")} disabled={items.length >= 30}><Glyph name="plus" />添加保密作品</button>
      </div>
      {items.length >= 30 ? <p className="editor-empty-note">最多添加 30 项。</p> : null}
    </section>
  );
}
