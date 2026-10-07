"use client";

import { useEffect, useState } from "react";
import type { PortfolioContentItem, PortfolioMediaItem } from "@/lib/profile";
import { showcaseMediaItems } from "@/lib/profile";
import { Glyph } from "@/components/glyph";

function repositoryName(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return (parts.at(-1) || parsed.hostname).replace(/\.git$/i, "");
  } catch {
    return "开源作品";
  }
}

function externalLinkProps(url: string) {
  return url.startsWith("http") ? { target: "_blank" as const, rel: "noreferrer" } : {};
}

function mediaFor(item: PortfolioContentItem): PortfolioMediaItem[] {
  return showcaseMediaItems(item);
}

function videoUrl(url: string) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(?:\?.*)?$/i.test(url);
}

export function ShowcaseGallery({ items, emptyText }: { items: PortfolioContentItem[]; emptyText: string }) {
  const visibleItems = items.filter((item) => {
    const type = item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source");
    return type === "open-source" ? Boolean(item.url) : Boolean(mediaFor(item).length && (item.summary || item.title));
  });
  const [active, setActive] = useState<{ itemId: string; mediaIndex: number } | null>(null);
  const [activeMediaAspect, setActiveMediaAspect] = useState<number | null>(null);
  const activeItem = active ? visibleItems.find((item) => item.id === active.itemId) ?? null : null;
  const activeMedia = activeItem ? mediaFor(activeItem) : [];
  const mediaIndex = active ? Math.min(active.mediaIndex, Math.max(activeMedia.length - 1, 0)) : 0;
  const currentMedia = activeMedia[mediaIndex];

  function openMedia(itemId: string, nextMediaIndex: number) {
    setActiveMediaAspect(null);
    setActive({ itemId, mediaIndex: nextMediaIndex });
  }

  useEffect(() => {
    if (!activeItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActive(null); setActiveMediaAspect(null); }
      if (event.key === "ArrowLeft" && active && activeMedia.length > 1) openMedia(active.itemId, (mediaIndex - 1 + activeMedia.length) % activeMedia.length);
      if (event.key === "ArrowRight" && active && activeMedia.length > 1) openMedia(active.itemId, (mediaIndex + 1) % activeMedia.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, activeItem, activeMedia.length, mediaIndex]);

  function moveMedia(amount: -1 | 1) {
    if (!active || activeMedia.length < 2) return;
    openMedia(active.itemId, (mediaIndex + amount + activeMedia.length) % activeMedia.length);
  }

  return (
    <>
      {!visibleItems.length ? <div className="df-empty-state">{emptyText}</div> : (
        <div className="df-showcase-grid">
          {visibleItems.map((item) => {
            const type = item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source");
            if (type === "open-source") {
              const name = repositoryName(item.url);
              let host = "源码仓库";
              try { host = new URL(item.url).hostname.replace(/^www\./, ""); } catch { /* retain generic host */ }
              return (
                <article className="df-showcase-card df-showcase-repo-card" key={item.id}>
                  <div className="df-showcase-repo-heading">
                    <svg className="df-showcase-repo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8 7h8M8 11h8M8 15h5M3 6v15" /></svg>
                    <h3 title={name}>{name}</h3>
                    <span className="df-showcase-public-badge">开源</span>
                  </div>
                  <p>开源作品，可通过源码链接查看项目内容。</p>
                  <div className="df-showcase-repo-meta"><span><i />{host}</span><a href={item.url} {...externalLinkProps(item.url)}>{item.urlLabel || "查看源码"}<Glyph name="arrow" /></a></div>
                </article>
              );
            }

            const media = mediaFor(item);
            const previewMedia = media.slice(0, 3);
            return (
              <article className="df-showcase-card df-showcase-company-card" key={item.id}>
                <div className="df-showcase-company-cover" style={{ gridTemplateColumns: `repeat(${previewMedia.length}, minmax(0, 1fr))` }}>
                  {previewMedia.map((entry, index) => {
                    const isVideo = entry.kind === "video" || videoUrl(entry.url);
                    return (
                      <button className="df-showcase-company-thumb" type="button" key={entry.id} onClick={() => openMedia(item.id, index)} aria-label={`查看作品素材 ${index + 1}`}>
                        {isVideo
                          ? <><video src={entry.url} muted playsInline preload="metadata" aria-hidden="true" onLoadedMetadata={(event) => { const video = event.currentTarget; if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(2, video.duration / 2); }} /><span className="df-showcase-company-video-play" aria-hidden="true">▶</span></>
                          : <img src={entry.url} alt="" loading="lazy" />}
                        {media.length > 3 && index === 2 ? <span className="df-showcase-company-more">+{media.length - 3}</span> : null}
                      </button>
                    );
                  })}
                </div>
                <button className="df-showcase-company-copy" type="button" onClick={() => openMedia(item.id, 0)} aria-label={`查看项目介绍：${item.summary || item.title}`}>
                  <span>{item.summary || item.title}</span><span>查看作品 <Glyph name="arrow" /></span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {activeItem && currentMedia ? (
        <div className="df-highlight-modal-backdrop df-showcase-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}>
          <section className="df-highlight-modal df-showcase-modal" style={{ width: activeMediaAspect !== null && activeMediaAspect < 1 ? Math.max(300, Math.min(560, window.innerHeight * 0.7 * activeMediaAspect)) : undefined }} role="dialog" aria-modal="true" aria-label="项目展示详情">
            <button className="df-highlight-modal-close" type="button" onClick={() => { setActive(null); setActiveMediaAspect(null); }} aria-label="关闭项目展示详情">×</button>
            <div className="df-highlight-modal-media df-showcase-modal-media" style={{ aspectRatio: activeMediaAspect ? String(activeMediaAspect) : "16 / 9" }} key={currentMedia.id}>
              {currentMedia.kind === "video" || videoUrl(currentMedia.url)
                ? <video src={currentMedia.url} controls playsInline preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) setActiveMediaAspect(video.videoWidth / video.videoHeight); }} />
                : <img src={currentMedia.url} alt="项目展示素材" onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setActiveMediaAspect(image.naturalWidth / image.naturalHeight); }} />}
              {activeMedia.length > 1 ? <>
                <button className="df-showcase-media-nav df-showcase-media-prev" type="button" onClick={() => moveMedia(-1)} aria-label="查看上一项素材">‹</button>
                <button className="df-showcase-media-nav df-showcase-media-next" type="button" onClick={() => moveMedia(1)} aria-label="查看下一项素材">›</button>
                <span className="df-showcase-media-count">{mediaIndex + 1} / {activeMedia.length}</span>
              </> : null}
            </div>
            <div className="df-highlight-modal-copy df-showcase-modal-copy"><p>{activeItem.summary || activeItem.title}</p></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
