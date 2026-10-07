"use client";

import { useEffect, useState } from "react";
import { formatYearMonth, type PortfolioContentItem } from "@/lib/profile";

function isVideoFile(url: string) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(url);
}

export function HighlightCarousel({ items }: { items: PortfolioContentItem[] }) {
  const [activeItem, setActiveItem] = useState<PortfolioContentItem | null>(null);
  const visibleItems = items.filter((item) => item.imageUrl || item.embedUrl);

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

  return (
    <>
      <div className="df-highlight-carousel">
        <div className={`df-highlight-track${visibleItems.length > 3 ? " df-highlight-track-many" : " df-highlight-track-static"}`}>
          {visibleItems.map((item) => {
            const dateLabel = formatYearMonth(item.period);
            return (
              <button
                className="df-highlight-card"
                type="button"
                key={item.id}
                onClick={() => setActiveItem(item)}
                aria-label={`查看高光时刻${dateLabel ? ` ${dateLabel}` : ""}：${item.title || "媒体内容"}`}
              >
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" loading="lazy" />
                  : isVideoFile(item.embedUrl)
                    ? <video src={item.embedUrl} muted playsInline preload="metadata" />
                    : <span className="df-highlight-card-placeholder" aria-hidden="true" />}
                {item.embedUrl ? <span className="df-highlight-play" aria-hidden="true">▶</span> : null}
                {dateLabel ? <time className="df-highlight-date" dateTime={item.period.replace(".", "-")}>{dateLabel}</time> : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeItem ? (
        <div className="df-highlight-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveItem(null); }}>
          <section className="df-highlight-modal" role="dialog" aria-modal="true" aria-label="高光时刻详情">
            <button className="df-highlight-modal-close" type="button" onClick={() => setActiveItem(null)} aria-label="关闭高光时刻详情">×</button>
            <div className="df-highlight-modal-media">
              {activeItem.embedUrl ? isVideoFile(activeItem.embedUrl)
                ? <video src={activeItem.embedUrl} poster={activeItem.imageUrl || undefined} controls playsInline />
                : <iframe src={activeItem.embedUrl} title={activeItem.title || "高光时刻视频"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                : activeItem.imageUrl ? <img src={activeItem.imageUrl} alt={activeItem.title} /> : null}
            </div>
            <div className="df-highlight-modal-copy">
              {formatYearMonth(activeItem.period) ? <time className="df-highlight-modal-date" dateTime={activeItem.period.replace(".", "-")}>{formatYearMonth(activeItem.period)}</time> : null}
              {activeItem.summary ? <p>{activeItem.summary}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
