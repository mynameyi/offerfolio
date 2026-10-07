"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { PortfolioContentItem } from "@/lib/profile";
import { Glyph } from "@/components/glyph";
import { adminFetch } from "@/components/admin-fetch";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v";

type UploadResult = { url: string; kind: "image" | "video"; error?: string };

function emptyItem(id: string, url: string, kind: "image" | "video", summary: string): PortfolioContentItem {
  return {
    id,
    title: "",
    subtitle: "",
    summary,
    organization: "",
    period: "",
    url: "",
    urlLabel: "查看详情",
    secondaryUrl: "",
    secondaryLabel: "",
    imageUrl: kind === "image" ? url : "",
    embedUrl: kind === "video" ? url : "",
    language: "",
    tags: [],
    value: "",
    level: 0,
    stars: 0,
    forks: 0,
  };
}

export function HighlightManager({ items, onChange }: { items: PortfolioContentItem[]; onChange: (items: PortfolioContentItem[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setError("");
    setFile(selected);
  }

  async function addHighlight() {
    if (!file || !description.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await adminFetch("/api/admin/highlights/media", { method: "POST", body: formData });
      const result = await response.json() as UploadResult;
      if (!response.ok) throw new Error(result.error || "上传失败，请重试。");

      onChange([...items, emptyItem(crypto.randomUUID(), result.url, result.kind, description.trim())]);
      setFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  function updateDescription(id: string, summary: string) {
    onChange(items.map((item) => item.id === id ? { ...item, summary } : item));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    onChange(reordered);
  }

  return (
    <section className="editor-panel highlight-manager">
      <div className="editor-panel-title"><span>02</span><div><h2>高光时刻</h2><p>添加一张图片或一段视频，再写一句描述。</p></div></div>

      <div className="highlight-add-form">
        <label className="field-label">图片或视频<input ref={fileInputRef} className="field-input highlight-file-input" type="file" accept={ACCEPTED_MEDIA} onChange={selectFile} /></label>
        {file ? <p className="highlight-file-name">{file.name}</p> : null}
        <label className="field-label">描述<textarea className="field-input field-textarea" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} rows={3} placeholder="简单介绍这个瞬间" /></label>
        {error ? <p className="highlight-upload-error" role="alert">{error}</p> : null}
        <button className="button button-quiet highlight-add-button" type="button" onClick={addHighlight} disabled={!file || !description.trim() || busy || items.length >= 20}>
          <Glyph name="plus" />{busy ? "正在上传…" : items.length >= 20 ? "最多添加 20 项" : "添加到列表"}
        </button>
      </div>

      <div className="highlight-list" role="list" aria-label="已添加的高光时刻">
        {items.map((item, index) => (
          <article className="highlight-list-item" role="listitem" key={item.id}>
            <div className="highlight-list-preview">
              {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.embedUrl ? <video src={item.embedUrl} muted playsInline preload="metadata" /> : <span aria-hidden="true" />}
            </div>
            <label className="field-label highlight-description-field">描述<textarea className="field-input field-textarea" value={item.summary || item.title} onChange={(event) => updateDescription(item.id, event.target.value)} maxLength={800} rows={2} /></label>
            <div className="highlight-list-actions">
              <div className="item-reorder-controls" role="group" aria-label={`调整高光时刻 ${index + 1} 的顺序`}>
                <button className="icon-button item-reorder-button" type="button" aria-label={`上移高光时刻 ${index + 1}`} title="上移" disabled={index === 0} onClick={() => moveItem(index, -1)}><Glyph name="arrow" className="item-order-arrow item-order-arrow-up" /></button>
                <button className="icon-button item-reorder-button" type="button" aria-label={`下移高光时刻 ${index + 1}`} title="下移" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><Glyph name="arrow" className="item-order-arrow item-order-arrow-down" /></button>
              </div>
              <button className="icon-button danger-button highlight-remove-button" type="button" aria-label={`删除高光时刻 ${index + 1}`} onClick={() => removeItem(item.id)}><Glyph name="trash" /></button>
            </div>
          </article>
        ))}
        {!items.length ? <p className="editor-empty-note">还没有添加高光时刻。</p> : null}
      </div>
    </section>
  );
}
