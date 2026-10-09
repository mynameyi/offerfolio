"use client";

import { useState } from "react";
import type { ExperienceDisplayMode, PortfolioMilestone } from "@/lib/profile";

function summaryItems(summary: string) {
  return summary
    .replace(/\r/g, "")
    .split(/\n+|\s+(?=\d+[、.．]\s*)/)
    .map((item) => item.replace(/^\d+[、.．]\s*/, "").trim())
    .filter(Boolean);
}

function ExperienceSummary({ summary }: { summary: string }) {
  const items = summaryItems(summary);
  if (!items.length) return null;
  if (items.length === 1) return <p className="df-experience-summary">{items[0]}</p>;
  return <ul className="df-experience-achievements">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
}

export function ExperienceDisplay({ items, mode }: { items: PortfolioMilestone[]; mode: ExperienceDisplayMode }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = Math.min(selectedIndex, Math.max(items.length - 1, 0));

  if (mode === "chapters") {
    return (
      <div className="df-experience-chapters">
        <div className="df-experience-chapter-nav" role="group" aria-label="选择职业经历">
          {items.map((item, index) => (
            <button
              className={`df-experience-chapter${index === activeIndex ? " is-active" : ""}`}
              type="button"
              key={item.id}
              aria-pressed={index === activeIndex}
              data-export-experience-index={index}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="df-experience-chapter-title">{item.title || "职位 / 角色"}</span>
              <span className="df-experience-chapter-period">{item.period}</span>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>

        {items.map((item, index) => (
          <article className="df-experience-chapter-detail" key={item.id} data-export-experience-panel={index} hidden={index !== activeIndex} aria-live={index === activeIndex ? "polite" : undefined}>
            <div className="df-experience-chapter-controls">
              {index === 0 ? <span className="df-experience-recent-label">最近经历</span> : <span className="df-experience-recent-label">职业经历</span>}
              <div className="df-experience-chapter-pagination">
                <span>{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
                <button type="button" aria-label="上一段职业经历" disabled={index === 0} data-export-experience-step="-1" onClick={() => setSelectedIndex((current) => Math.max(0, current - 1))}>‹</button>
                <button type="button" aria-label="下一段职业经历" disabled={index >= items.length - 1} data-export-experience-step="1" onClick={() => setSelectedIndex((current) => Math.min(items.length - 1, current + 1))}>›</button>
              </div>
            </div>
            <header className="df-experience-chapter-heading">
              <h3>{item.title || "职位 / 角色"}</h3>
              <p>{item.organization}</p>
              <span>{item.period}</span>
            </header>
            <ExperienceSummary summary={item.summary} />
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="df-experience-timeline" role="list">
      {items.map((item, index) => (
        <article className={`df-experience-timeline-item${index === 0 ? " is-featured" : ""}`} key={item.id} role="listitem">
          <div className="df-experience-timeline-marker" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div>
          <span className="df-experience-timeline-period">{item.period}</span>
          <div className="df-experience-timeline-content">
            <div className="df-experience-timeline-heading">
              <div><h3>{item.title || "职位 / 角色"}</h3><p>{item.organization}</p></div>
              {index === 0 && items.length > 1 ? <span className="df-experience-recent-label">最近经历</span> : null}
            </div>
            <ExperienceSummary summary={item.summary} />
          </div>
        </article>
      ))}
    </div>
  );
}
