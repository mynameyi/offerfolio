"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PortfolioModuleKey } from "@/lib/profile";

type NavigationItem = { key: PortfolioModuleKey; label: string; href: string };

export function PortfolioNavigation({ items }: { items: NavigationItem[] }) {
  const [activeKey, setActiveKey] = useState<PortfolioModuleKey | null>(items[0]?.key ?? null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const desktopNavRef = useRef<HTMLElement>(null);
  const desktopLinks = useRef(new Map<PortfolioModuleKey, HTMLAnchorElement>());

  useEffect(() => {
    if (!items.length) return;
    let frame = 0;

    function updateActiveSection() {
      const headerBottom = document.querySelector<HTMLElement>(".df-header")?.getBoundingClientRect().bottom ?? 0;
      const marker = Math.max(headerBottom + 12, Math.min(window.innerHeight * 0.38, headerBottom + 180));
      let current = items[0].key;

      for (const item of items) {
        const section = document.getElementById(item.href.slice(1));
        if (section && section.getBoundingClientRect().top <= marker) current = item.key;
      }

      setActiveKey((previous) => previous === current ? previous : current);
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    }

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [items]);

  useEffect(() => {
    if (!activeKey) return;
    const nav = desktopNavRef.current;
    const link = desktopLinks.current.get(activeKey);
    if (!nav || !link) return;

    const updateIndicator = () => {
      setIndicator({ left: link.offsetLeft, width: link.offsetWidth });
      const linkLeft = link.offsetLeft;
      const linkRight = linkLeft + link.offsetWidth;
      if (linkLeft < nav.scrollLeft || linkRight > nav.scrollLeft + nav.clientWidth) {
        nav.scrollTo({ left: linkLeft - (nav.clientWidth - link.offsetWidth) / 2, behavior: "smooth" });
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeKey, items]);

  return (
    <>
      <details className="df-mobile-menu">
        <summary aria-label="打开导航"><span /><span /><span /></summary>
        <nav aria-label="移动导航">
          {items.map((item) => <a className={activeKey === item.key ? "is-active" : undefined} key={item.key} href={item.href} aria-current={activeKey === item.key ? "location" : undefined}>{item.label}</a>)}
          <ThemeToggle />
        </nav>
      </details>
      <nav className="df-nav" aria-label="主导航" ref={desktopNavRef}>
        <span className="df-nav-active-indicator" aria-hidden="true" style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />
        {items.map((item) => (
          <a
            className={activeKey === item.key ? "is-active" : undefined}
            key={item.key}
            href={item.href}
            ref={(node) => { if (node) desktopLinks.current.set(item.key, node); else desktopLinks.current.delete(item.key); }}
            aria-current={activeKey === item.key ? "location" : undefined}
          >
            {item.label}
          </a>
        ))}
        <ThemeToggle />
      </nav>
    </>
  );
}
