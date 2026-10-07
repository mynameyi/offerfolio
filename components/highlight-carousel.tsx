"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioContentItem } from "@/lib/profile";

function isVideoFile(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function mediaType(item: PortfolioContentItem) {
  return item.embedUrl ? "视频" : item.imageUrl ? "图片" : "时刻";
}

export function HighlightCarousel({ items }: { items: PortfolioContentItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<PortfolioContentItem | null>(null);

  useEffect(() => {
    if (!activeItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveItem(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeItem]);

  function moveTrack(direction: -1 | 1) {
    const card = trackRef.current?.querySelector<HTMLElement>(".df-highlight-card");
    trackRef.current?.scrollBy({ left: direction * ((card?.offsetWidth || 300) + 18), behavior: "smooth" });
  }

  return (
    <>
      <div className="df-highlight-carousel">
        <div className="df-highlight-carousel-controls">
          <span>精选 {items.length} 个时刻</span>
          <div>
            <button type="button" onClick={() => moveTrack(-1)} aria-label="向左浏览高光时刻">←</button>
            <button type="button" onClick={() => moveTrack(1)} aria-label="向右浏览高光时刻">→</button>
          </div>
        </div>
        <div className="df-highlight-track" ref={trackRef}>
          {items.map((item) => (
            <button className="df-highlight-card" type="button" key={item.id} onClick={() => setActiveItem(item)} aria-label={`查看高光时刻：${item.title}`}>
              <span className="df-highlight-card-media">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span className="df-highlight-card-placeholder"><i>{item.title.slice(0, 1) || "✦"}</i></span>}
                {item.embedUrl ? <span className="df-highlight-play" aria-hidden="true">▶</span> : null}
                <span className="df-highlight-media-label">{mediaType(item)}</span>
              </span>
              <span className="df-highlight-card-copy">
                {item.value ? <small>{item.value}</small> : null}
                <strong>{item.title || "未命名高光"}</strong>
                <span>{item.subtitle || item.period || item.summary || "点击查看详情"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeItem ? (
        <div className="df-highlight-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveItem(null); }}>
          <section className="df-highlight-modal" role="dialog" aria-modal="true" aria-labelledby="df-highlight-modal-title">
            <button className="df-highlight-modal-close" type="button" onClick={() => setActiveItem(null)} aria-label="关闭高光时刻详情">×</button>
            <div className="df-highlight-modal-media">
              {activeItem.embedUrl ? isVideoFile(activeItem.embedUrl)
                ? <video src={activeItem.embedUrl} poster={activeItem.imageUrl || undefined} controls playsInline />
                : <iframe src={activeItem.embedUrl} title={activeItem.title || "高光时刻视频"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                : activeItem.imageUrl ? <img src={activeItem.imageUrl} alt={activeItem.title} /> : <div className="df-highlight-modal-placeholder">{activeItem.title}</div>}
            </div>
            <div className="df-highlight-modal-copy">
              <p className="df-eyebrow">{activeItem.subtitle || activeItem.period || "高光时刻"}</p>
              <h2 id="df-highlight-modal-title">{activeItem.title || "高光时刻"}</h2>
              {activeItem.value ? <span className="df-highlight-modal-value">{activeItem.value}</span> : null}
              <p>{activeItem.summary || "更多细节将在交流中分享。"}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
