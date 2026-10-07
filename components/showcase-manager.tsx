"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Glyph } from "@/components/glyph";
import { showcaseMediaItems, type PortfolioContentItem, type PortfolioMediaItem } from "@/lib/profile";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v";
type ShowcaseType = "open-source" | "company-project";
type UploadResult = { url: string; kind: "image" | "video"; error?: string };

function emptyItem(type: ShowcaseType): PortfolioContentItem {
  return {
    id: crypto.randomUUID(),
    showcaseType: type,
    mediaItems: [],
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
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    setUploading((current) => ({ ...current, [id]: true }));
    setError((current) => ({ ...current, [id]: "" }));

    try {
      const mediaItems: PortfolioMediaItem[] = [...showcaseMediaItems(items.find((item) => item.id === id) ?? emptyItem("company-project"))];
      const failures: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        try {
          const response = await fetch("/api/admin/showcase/media", { method: "POST", body: formData });
          const result = await response.json() as UploadResult;
          if (!response.ok) throw new Error(result.error || "上传失败。");
          mediaItems.push({ id: crypto.randomUUID(), url: result.url, kind: result.kind });
        } catch (caught) {
          failures.push(caught instanceof Error ? `${file.name}：${caught.message}` : `${file.name}：上传失败`);
        }
      }
      update(id, { mediaItems, imageUrl: "", embedUrl: "" });
      if (failures.length) setError((current) => ({ ...current, [id]: failures.join("；") }));
    } finally {
      setUploading((current) => ({ ...current, [id]: false }));
    }
  }

  function removeMedia(item: PortfolioContentItem, mediaId: string) {
    update(item.id, { mediaItems: showcaseMediaItems(item).filter((media) => media.id !== mediaId), imageUrl: "", embedUrl: "" });
  }

  return (
    <section className="editor-panel showcase-manager">
      <div className="editor-panel-title"><span>03</span><div><h2>作品展示</h2><p>开源作品只需填写源码链接；企业项目可添加多张图片或多段视频，并补充介绍。</p></div></div>
      <div className="editor-items">
        {items.map((item, index) => {
          const type: ShowcaseType = item.showcaseType ?? (item.imageUrl || item.embedUrl || item.mediaItems?.length ? "company-project" : "open-source");
          const mediaItems = showcaseMediaItems(item);
          return (
            <article className="editor-item showcase-editor-item" key={item.id}>
              <div className="editor-item-top">
                <strong>作品 {String(index + 1).padStart(2, "0")}</strong>
                <div className="showcase-item-actions">
                  <select className="field-input showcase-type-select" aria-label={`作品 ${index + 1} 类型`} value={type} onChange={(event) => update(item.id, { showcaseType: event.target.value as ShowcaseType })}>
                    <option value="open-source">开源作品</option>
                    <option value="company-project">企业项目</option>
                  </select>
                  <button className="icon-button danger-button" type="button" aria-label={`删除作品 ${index + 1}`} onClick={() => removeItem(item.id)}><Glyph name="trash" /></button>
                </div>
              </div>

              {type === "open-source" ? (
                <label className="field-label" htmlFor={`${item.id}-repository`}>源码链接
                  <input id={`${item.id}-repository`} className="field-input" type="url" value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="https://github.com/用户名/仓库名" />
                </label>
              ) : (
                <div className="showcase-company-fields">
                  <div className="field-label">项目图片或视频
                    <div className="showcase-media-list">
                      {mediaItems.map((media, mediaIndex) => (
                        <div className="showcase-media-item" key={media.id}>
                          {media.kind === "image" ? <img src={media.url} alt={`项目素材 ${mediaIndex + 1}`} /> : <video src={media.url} controls preload="metadata" playsInline />}
                          <button className="icon-button danger-button showcase-media-remove" type="button" aria-label={`删除项目素材 ${mediaIndex + 1}`} onClick={() => removeMedia(item, media.id)}><Glyph name="trash" /></button>
                        </div>
                      ))}
                      <button className="showcase-upload-button" type="button" onClick={() => inputs.current[item.id]?.click()} disabled={uploading[item.id]}>
                        <Glyph name="plus" />{uploading[item.id] ? "正在上传…" : "添加图片或视频"}
                      </button>
                    </div>
                    <input ref={(element) => { inputs.current[item.id] = element; }} className="showcase-hidden-file" type="file" accept={ACCEPTED_MEDIA} multiple onChange={(event) => void upload(item.id, event)} aria-label="添加项目图片或视频" />
                    {error[item.id] ? <span className="showcase-upload-error" role="alert">{error[item.id]}</span> : null}
                  </div>
                  <label className="field-label">项目介绍
                    <textarea className="field-input field-textarea" rows={3} value={item.summary} onChange={(event) => update(item.id, { summary: event.target.value })} placeholder="介绍项目背景、作用或值得关注的成果" />
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
        <button className="button button-quiet" type="button" onClick={() => addItem("company-project")} disabled={items.length >= 30}><Glyph name="plus" />添加企业项目</button>
      </div>
      {items.length >= 30 ? <p className="editor-empty-note">最多添加 30 项。</p> : null}
    </section>
  );
}
