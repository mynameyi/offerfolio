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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const activeItem = activeItemId ? visibleItems.find((item) => item.id === activeItemId) ?? null : null;
  const activeMedia = activeItem ? mediaFor(activeItem) : [];

  useEffect(() => {
    if (!activeItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveItemId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeItem]);

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
            return (
              <button className="df-showcase-card df-showcase-company-card" key={item.id} type="button" onClick={() => setActiveItemId(item.id)} aria-label={`查看作品详情：${item.summary || item.title}`}>
                <span className={`df-showcase-company-cover${item.showcaseCoverUrl ? " has-cover" : ""}`} aria-hidden="true">
                  {item.showcaseCoverUrl ? <img src={item.showcaseCoverUrl} alt="" loading="lazy" /> : null}
                  <span className="df-showcase-company-video-play">▶</span>
                  {media.length > 1 ? <span className="df-showcase-company-more">{media.length} 项素材</span> : null}
                </span>
                <span className="df-showcase-company-copy">
                  <span>{item.summary || item.title}</span><span>查看作品 <Glyph name="arrow" /></span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeItem && activeMedia.length ? (
        <div className="df-highlight-modal-backdrop df-showcase-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveItemId(null); }}>
          <section className="df-highlight-modal df-showcase-modal" role="dialog" aria-modal="true" aria-label="项目展示详情">
            <button className="df-highlight-modal-close" type="button" onClick={() => setActiveItemId(null)} aria-label="关闭项目展示详情">×</button>
            <div className={`df-showcase-modal-media-grid${activeMedia.length === 1 ? " is-single" : ""}`}>
              {activeMedia.map((media, index) => (
                <div className="df-showcase-modal-media" key={media.id}>
                  {media.kind === "video" || videoUrl(media.url)
                    ? <video src={media.url} controls playsInline preload="metadata" aria-label={`项目视频 ${index + 1}`} />
                    : <img src={media.url} alt={`项目展示素材 ${index + 1}`} loading="lazy" />}
                </div>
              ))}
            </div>
            <div className="df-highlight-modal-copy df-showcase-modal-copy"><p>{activeItem.summary || activeItem.title}</p></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
