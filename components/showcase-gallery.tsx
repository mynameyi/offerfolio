"use client";

import { useEffect, useState } from "react";
import type { PortfolioContentItem, PortfolioMediaItem } from "@/lib/profile";
import { showcaseMediaItems } from "@/lib/profile";
import { Glyph } from "@/components/glyph";
import { PortfolioImage } from "@/components/portfolio-image";

type ShowcaseFilter = "all" | "open-source" | "company-project";

function repositoryName(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return (parts.at(-1) || parsed.hostname).replace(/\.git$/i, "");
  } catch {
    return "开源作品";
  }
}

function repositoryHost(url: string): "github" | "gitee" | "repository" {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "github.com") return "github";
    if (host === "gitee.com") return "gitee";
  } catch {
    // Use the generic repository mark when an old or incomplete URL is present.
  }
  return "repository";
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

function PlatformMark({ host, className = "" }: { host: "github" | "gitee" | "repository"; className?: string }) {
  if (host === "github") return <img className={`df-showcase-platform-icon is-github ${className}`} src="/brand/github-invertocat.svg" alt="" aria-hidden="true" />;
  if (host === "gitee") return <img className={`df-showcase-platform-icon is-gitee ${className}`} src="/brand/gitee-mark.svg" alt="" aria-hidden="true" />;
  return <svg className={`df-showcase-platform-icon is-generic ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8 7h8M8 11h8M8 15h5M3 6v15" /></svg>;
}

export function ShowcaseGallery({ items, emptyText }: { items: PortfolioContentItem[]; emptyText: string }) {
  const visibleItems = items.filter((item) => {
    const type = item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source");
    return type === "open-source" ? Boolean(item.url) : Boolean(mediaFor(item).length && (item.summary || item.title));
  });
  const openSourceCount = visibleItems.filter((item) => (item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source")) === "open-source").length;
  const companyCount = visibleItems.length - openSourceCount;
  const [filter, setFilter] = useState<ShowcaseFilter>("all");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const activeItem = activeItemId ? visibleItems.find((item) => item.id === activeItemId) ?? null : null;
  const activeMedia = activeItem ? mediaFor(activeItem) : [];
  const filteredItems = visibleItems.filter((item) => {
    if (filter === "all") return true;
    const type = item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source");
    return type === filter;
  });

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
        <>
          <div className="df-showcase-filters" role="group" aria-label="按作品类型筛选">
            <button className={`df-showcase-filter${filter === "all" ? " is-active" : ""}`} type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>全部 <span>{visibleItems.length}</span></button>
            <button className={`df-showcase-filter${filter === "open-source" ? " is-active" : ""}`} type="button" aria-pressed={filter === "open-source"} onClick={() => setFilter("open-source")}>开源项目 <span>{openSourceCount}</span></button>
            <button className={`df-showcase-filter${filter === "company-project" ? " is-active" : ""}`} type="button" aria-pressed={filter === "company-project"} onClick={() => setFilter("company-project")}>企业项目 <span>{companyCount}</span></button>
            <span className="df-showcase-sort-note">按展示顺序排列</span>
          </div>
          {filteredItems.length ? (
            <div className="df-showcase-grid">
              {filteredItems.map((item) => {
                const type = item.showcaseType ?? (mediaFor(item).length ? "company-project" : "open-source");
                if (type === "open-source") {
                  const host = repositoryHost(item.url);
                  const hostLabel = host === "github" ? "GITHUB" : host === "gitee" ? "GITEE" : "源码仓库";
                  const name = item.title || repositoryName(item.url);
                  const tags = item.tags.filter(Boolean).slice(0, 5);
                  return (
                    <article className="df-showcase-card df-showcase-repo-card" key={item.id}>
                      <div className="df-showcase-repo-origin"><PlatformMark host={host} /><span>{hostLabel} · 开源项目</span></div>
                      <div className="df-showcase-repo-heading">
                        <h3 title={name}>{name}</h3>
                        <span className="df-showcase-public-badge">开源</span>
                      </div>
                      <p className="df-showcase-repo-about">{item.summary || "仓库暂未填写 About 简介。"}</p>
                      {tags.length ? <div className="df-showcase-topic-list" aria-label="主题标签">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
                      <div className="df-showcase-repo-footer">
                        <div className="df-showcase-repo-stats">
                          {item.language ? <span className="df-showcase-language"><i />{item.language}</span> : null}
                          {item.stars > 0 ? <span>★ {item.stars.toLocaleString("zh-CN")}</span> : null}
                          {item.forks > 0 ? <span>⑂ {item.forks.toLocaleString("zh-CN")}</span> : null}
                        </div>
                        <a className="df-showcase-repo-link" href={item.url} {...externalLinkProps(item.url)}><PlatformMark host={host} />{item.urlLabel || "查看源码"}<Glyph name="arrow" /></a>
                      </div>
                    </article>
                  );
                }

                const media = mediaFor(item);
                return (
                  <button className="df-showcase-card df-showcase-company-card" key={item.id} type="button" onClick={() => setActiveItemId(item.id)} aria-label={`查看作品详情：${item.summary || item.title}`}>
                    <span className={`df-showcase-company-cover${item.showcaseCoverUrl ? " has-cover" : ""}`} aria-hidden="true">
                      {item.showcaseCoverUrl ? <PortfolioImage src={item.showcaseCoverUrl} alt="" width={720} height={430} sizes="(max-width: 768px) 90vw, 33vw" /> : null}
                      <span className="df-showcase-company-video-play">▶</span>
                      {media.length > 1 ? <span className="df-showcase-company-more">{media.length} 项素材</span> : null}
                    </span>
                    <span className="df-showcase-company-copy">
                      <span>{item.title ? <strong>{item.title}</strong> : null}<small>{item.summary || "通过图片或视频了解项目成果。"}</small></span>
                      <span>查看案例 <Glyph name="arrow" /></span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : <div className="df-empty-state">该类型暂时没有展示内容。</div>}
        </>
      )}

      {activeItem && activeMedia.length ? (
        <div className="df-highlight-modal-backdrop df-showcase-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveItemId(null); }}>
          <section className="df-highlight-modal df-showcase-modal" role="dialog" aria-modal="true" aria-label={`项目展示详情：${activeItem.title || "企业项目"}`}>
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
