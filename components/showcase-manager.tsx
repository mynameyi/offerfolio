"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Glyph } from "@/components/glyph";
import { adminFetch } from "@/components/admin-fetch";
import { showcaseMediaItems, type PortfolioContentItem, type PortfolioMediaItem } from "@/lib/profile";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v";
type ShowcaseType = "open-source" | "company-project";
type UploadResult = { url: string; kind: "image" | "video"; error?: string };
type MediaFrame = { source: HTMLImageElement | HTMLVideoElement; width: number; height: number; cleanup: () => void };

function repositoryName(url: string) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1)?.replace(/\.git$/i, "") || "开源作品";
  } catch {
    return "开源作品";
  }
}

function loadImageFrame(url: string): Promise<MediaFrame> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => reject(new Error("读取图片缩略图超时。")), 20_000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => { image.src = ""; } });
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("无法读取图片缩略图。"));
    };
    image.src = url;
  });
}

function loadVideoFrame(url: string): Promise<MediaFrame> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const timer = window.setTimeout(() => finish(new Error("读取视频缩略图超时。")), 30_000);
    let settled = false;
    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener("error", onError);
      if (error) {
        cleanup();
        reject(error);
      } else {
        resolve({ source: video, width: video.videoWidth, height: video.videoHeight, cleanup });
      }
    };
    const onError = () => finish(new Error("浏览器无法读取该视频格式的缩略图。"));
    video.addEventListener("error", onError, { once: true });
    video.addEventListener("loadedmetadata", () => {
      const seekTo = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.duration / 3) : 0;
      if (seekTo <= 0) {
        if (video.readyState >= 2) finish();
        else video.addEventListener("loadeddata", () => finish(), { once: true });
        return;
      }
      video.addEventListener("seeked", () => finish(), { once: true });
      video.currentTime = seekTo;
    }, { once: true });
    video.src = url;
    video.load();
  });
}

async function createMontage(mediaItems: PortfolioMediaItem[]): Promise<Blob> {
  const selected = mediaItems.slice(0, 3);
  if (!selected.length) throw new Error("请先添加图片或视频。");
  const frames: MediaFrame[] = [];
  try {
    for (const media of selected) {
      frames.push(media.kind === "video" ? await loadVideoFrame(media.url) : await loadImageFrame(media.url));
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法生成缩略图。");
    context.fillStyle = "#17151a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const gutter = 6;
    const panelWidth = (canvas.width - gutter * (frames.length - 1)) / frames.length;
    frames.forEach((frame, index) => {
      const x = index * (panelWidth + gutter);
      const scale = Math.max(panelWidth / frame.width, canvas.height / frame.height);
      const cropWidth = panelWidth / scale;
      const cropHeight = canvas.height / scale;
      const cropX = (frame.width - cropWidth) / 2;
      const cropY = (frame.height - cropHeight) / 2;
      context.drawImage(frame.source, cropX, cropY, cropWidth, cropHeight, x, 0, panelWidth, canvas.height);
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("缩略图编码失败。")), "image/jpeg", 0.9);
    });
  } finally {
    frames.forEach((frame) => frame.cleanup());
  }
}

function mediaSignature(mediaItems: PortfolioMediaItem[]) {
  return JSON.stringify(mediaItems.map(({ id, url, kind }) => [id, url, kind]));
}

function emptyItem(type: ShowcaseType): PortfolioContentItem {
  return {
    id: crypto.randomUUID(),
    showcaseType: type,
    mediaItems: [],
    showcaseCoverUrl: "",
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
  const [coverStatus, setCoverStatus] = useState<Record<string, string>>({});
  const [repositoryLoading, setRepositoryLoading] = useState<Record<string, boolean>>({});
  const [repositoryStatus, setRepositoryStatus] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemsRef = useRef(items);
  const onChangeRef = useRef(onChange);
  const coverJobs = useRef(new Set<string>());
  itemsRef.current = items;
  onChangeRef.current = onChange;

  const replaceItems = useCallback((nextItems: PortfolioContentItem[]) => {
    itemsRef.current = nextItems;
    onChangeRef.current(nextItems);
  }, []);

  function update(id: string, changes: Partial<PortfolioContentItem>) {
    replaceItems(itemsRef.current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  const generateCover = useCallback(async (itemId: string, mediaItems: PortfolioMediaItem[], force = false) => {
    const signature = mediaSignature(mediaItems);
    const jobKey = `${itemId}:${signature}`;
    if (!mediaItems.length || coverJobs.current.has(jobKey)) return;
    const currentItem = itemsRef.current.find((item) => item.id === itemId);
    if (!force && currentItem?.showcaseCoverUrl) return;
    coverJobs.current.add(jobKey);
    setCoverStatus((current) => ({ ...current, [itemId]: "正在生成组合缩略图…" }));
    try {
      const blob = await createMontage(mediaItems);
      const formData = new FormData();
      formData.set("file", new File([blob], "showcase-cover.jpg", { type: "image/jpeg" }));
      const response = await adminFetch("/api/admin/showcase/media", { method: "POST", body: formData });
      const result = await response.json() as UploadResult;
      if (!response.ok) throw new Error(result.error || "缩略图上传失败。");
      const latestItems = itemsRef.current;
      const latestItem = latestItems.find((item) => item.id === itemId);
      if (latestItem && mediaSignature(showcaseMediaItems(latestItem)) === signature) {
        replaceItems(latestItems.map((item) => item.id === itemId ? { ...item, showcaseCoverUrl: result.url } : item));
        setCoverStatus((current) => ({ ...current, [itemId]: "卡片缩略图已生成，保存更改后会公开显示。" }));
      } else {
        setCoverStatus((current) => ({ ...current, [itemId]: "" }));
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "组合缩略图生成失败。";
      setCoverStatus((current) => ({ ...current, [itemId]: message }));
    } finally {
      coverJobs.current.delete(jobKey);
    }
  }, [replaceItems]);

  useEffect(() => {
    for (const item of items) {
      const type = item.showcaseType ?? (item.imageUrl || item.embedUrl || item.mediaItems?.length ? "company-project" : "open-source");
      const mediaItems = showcaseMediaItems(item);
      if (type === "company-project" && mediaItems.length && !item.showcaseCoverUrl) void generateCover(item.id, mediaItems);
    }
  }, [items, generateCover]);

  function addItem(type: ShowcaseType) {
    if (itemsRef.current.length >= 30) return;
    replaceItems([...itemsRef.current, emptyItem(type)]);
  }

  function removeItem(id: string) {
    replaceItems(itemsRef.current.filter((item) => item.id !== id));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= itemsRef.current.length) return;
    const reordered = [...itemsRef.current];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    replaceItems(reordered);
  }

  async function readRepositoryMetadata(item: PortfolioContentItem) {
    if (!item.url.trim() || repositoryLoading[item.id]) return;
    setRepositoryLoading((current) => ({ ...current, [item.id]: true }));
    setRepositoryStatus((current) => ({ ...current, [item.id]: "正在读取仓库简介和标签…" }));
    try {
      const response = await adminFetch("/api/admin/showcase/repository-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });
      const result = await response.json() as {
        metadata?: { title?: string; summary?: string; language?: string; tags?: string[]; stars?: number; forks?: number };
        error?: string;
      };
      if (!response.ok || !result.metadata) throw new Error(result.error || "仓库信息读取失败。");
      const metadata = result.metadata;
      const latestItem = itemsRef.current.find((candidate) => candidate.id === item.id);
      if (!latestItem || latestItem.url.trim() !== item.url.trim()) throw new Error("仓库链接已更改，请重新读取信息。");
      update(item.id, {
        title: metadata.title || latestItem.title || repositoryName(item.url),
        summary: metadata.summary || latestItem.summary,
        language: metadata.language || latestItem.language,
        tags: metadata.tags?.length ? metadata.tags : latestItem.tags,
        stars: metadata.stars ?? latestItem.stars,
        forks: metadata.forks ?? latestItem.forks,
      });
      setRepositoryStatus((current) => ({ ...current, [item.id]: "仓库信息已填入，可继续编辑；点页面底部“保存更改”后写入数据库。" }));
    } catch (caught) {
      setRepositoryStatus((current) => ({ ...current, [item.id]: caught instanceof Error ? caught.message : "仓库信息读取失败。" }));
    } finally {
      setRepositoryLoading((current) => ({ ...current, [item.id]: false }));
    }
  }

  async function upload(id: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    setUploading((current) => ({ ...current, [id]: true }));
    setError((current) => ({ ...current, [id]: "" }));

    try {
      const mediaItems: PortfolioMediaItem[] = [...showcaseMediaItems(itemsRef.current.find((item) => item.id === id) ?? emptyItem("company-project"))];
      const failures: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        try {
          const response = await adminFetch("/api/admin/showcase/media", { method: "POST", body: formData });
          const result = await response.json() as UploadResult;
          if (!response.ok) throw new Error(result.error || "上传失败。");
          mediaItems.push({ id: crypto.randomUUID(), url: result.url, kind: result.kind });
        } catch (caught) {
          failures.push(caught instanceof Error ? `${file.name}：${caught.message}` : `${file.name}：上传失败`);
        }
      }
      update(id, { mediaItems, showcaseCoverUrl: "", imageUrl: "", embedUrl: "" });
      setCoverStatus((current) => ({ ...current, [id]: "" }));
      if (failures.length) setError((current) => ({ ...current, [id]: failures.join("；") }));
    } finally {
      setUploading((current) => ({ ...current, [id]: false }));
    }
  }

  function removeMedia(item: PortfolioContentItem, mediaId: string) {
    update(item.id, { mediaItems: showcaseMediaItems(item).filter((media) => media.id !== mediaId), showcaseCoverUrl: "", imageUrl: "", embedUrl: "" });
    setCoverStatus((current) => ({ ...current, [item.id]: "" }));
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
                  <div className="item-reorder-controls" role="group" aria-label={`调整作品 ${index + 1} 的顺序`}>
                    <button className="icon-button item-reorder-button" type="button" aria-label={`上移作品 ${index + 1}`} title="上移" disabled={index === 0} onClick={() => moveItem(index, -1)}><Glyph name="arrow" className="item-order-arrow item-order-arrow-up" /></button>
                    <button className="icon-button item-reorder-button" type="button" aria-label={`下移作品 ${index + 1}`} title="下移" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><Glyph name="arrow" className="item-order-arrow item-order-arrow-down" /></button>
                  </div>
                  <button className="icon-button danger-button" type="button" aria-label={`删除作品 ${index + 1}`} onClick={() => removeItem(item.id)}><Glyph name="trash" /></button>
                </div>
              </div>

              {type === "open-source" ? (
                <div className="showcase-repository-fields">
                  <div className="showcase-repository-fetch-row">
                    <label className="field-label" htmlFor={`${item.id}-repository`}>源码链接
                      <input id={`${item.id}-repository`} className="field-input" type="url" value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="https://github.com/用户名/仓库名 或 https://gitee.com/用户名/仓库名" />
                    </label>
                    <button className="button button-quiet showcase-repository-fetch" type="button" disabled={!item.url.trim() || repositoryLoading[item.id]} onClick={() => void readRepositoryMetadata(item)}>{repositoryLoading[item.id] ? "正在读取…" : "读取仓库信息"}</button>
                  </div>
                  <p className={`showcase-repository-status${repositoryStatus[item.id] && !repositoryStatus[item.id].includes("已填入") && !repositoryStatus[item.id].includes("正在读取") ? " is-error" : ""}`} role="status">{repositoryStatus[item.id] || "读取公开仓库的名称、About 简介、Topics 和主要语言；信息可修改后再保存。"}</p>
                  <div className="showcase-repository-metadata-fields">
                    <label className="field-label">作品名称
                      <input className="field-input" type="text" value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="默认使用仓库名称" />
                    </label>
                    <label className="field-label">About 简介
                      <textarea className="field-input field-textarea" rows={3} value={item.summary} onChange={(event) => update(item.id, { summary: event.target.value })} placeholder="从仓库自动读取，也可以自行补充" />
                    </label>
                    <div className="showcase-repository-meta-row">
                      <label className="field-label">Topics / 主题标签
                        <input className="field-input" type="text" value={item.tags.join(", ")} onChange={(event) => update(item.id, { tags: event.target.value.split(/[,，;；、]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12) })} placeholder="例如：nextjs, portfolio, sqlite" />
                      </label>
                      <label className="field-label">主要语言
                        <input className="field-input" type="text" value={item.language} onChange={(event) => update(item.id, { language: event.target.value })} placeholder="例如：TypeScript" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="showcase-company-fields">
                  <label className="field-label">项目名称
                    <input className="field-input" type="text" value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="例如：AI 研发平台" />
                  </label>
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
                    {coverStatus[item.id] ? <span className={`showcase-cover-status${coverStatus[item.id].includes("失败") || coverStatus[item.id].includes("超时") || coverStatus[item.id].includes("无法") ? " is-error" : ""}`} role="status">{coverStatus[item.id]}</span> : null}
                    {coverStatus[item.id] && (coverStatus[item.id].includes("失败") || coverStatus[item.id].includes("超时") || coverStatus[item.id].includes("无法")) ? <button className="button button-quiet showcase-cover-retry" type="button" onClick={() => void generateCover(item.id, mediaItems, true)}>重试生成缩略图</button> : null}
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
