"use client";

import { useEffect, useState } from "react";
import type { PortfolioContentItem } from "@/lib/profile";

export function AchievementGallery({ items, emptyText }: { items: PortfolioContentItem[]; emptyText: string }) {
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

  if (!items.length) return <div className="df-empty-state">{emptyText}</div>;

  return (
    <>
      <div className="df-achievement-grid">
        {items.map((item) => (
          <article className="df-achievement-card" key={item.id}>
            {item.imageUrl ? (
              <button
                className="df-achievement-image-button"
                type="button"
                onClick={() => setActiveItem(item)}
                aria-label={`放大查看：${item.title}`}
              >
                <img src={item.imageUrl} alt={item.title} loading="lazy" />
              </button>
            ) : <div className="df-achievement-placeholder">✦</div>}
            <div className="df-achievement-copy">
              {item.period ? <p className="df-card-period">{item.period}</p> : null}
              <h3>{item.title}</h3>
              {item.summary ? <p>{item.summary}</p> : null}
            </div>
          </article>
        ))}
      </div>

      {activeItem?.imageUrl ? (
        <div
          className="df-achievement-lightbox-backdrop"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveItem(null); }}
        >
          <figure className="df-achievement-lightbox" role="dialog" aria-modal="true" aria-label={`证书图片：${activeItem.title}`}>
            <button className="df-achievement-lightbox-close" type="button" onClick={() => setActiveItem(null)} aria-label="关闭图片">×</button>
            <img src={activeItem.imageUrl} alt={activeItem.title} />
            <figcaption>
              {activeItem.period ? <span>{activeItem.period}</span> : null}
              <strong>{activeItem.title}</strong>
              {activeItem.summary ? <p>{activeItem.summary}</p> : null}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
