"use client";

import { useEffect } from "react";
import { PROFILE_MODULES, type PortfolioModuleKey } from "@/lib/profile";

const moduleKeys = new Set<string>(PROFILE_MODULES.map(({ key }) => key));
const visitorActions = new Set(["contact", "resume", "github", "gitee"]);

export function VisitorAnalytics({ visitKey: initialVisitKey }: { visitKey: string }) {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const visitKey = initialVisitKey;
    if (!/^[0-9a-f-]{36}$/i.test(visitKey)) return;

    if (query.has("of_token") || query.has("of_visit")) {
      query.delete("of_token");
      query.delete("of_visit");
      const remainingQuery = query.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`);
    }

    let lastTick = Date.now();
    let wasVisible = document.visibilityState !== "hidden";
    let totalMilliseconds = 0;
    const moduleMilliseconds = new Map<PortfolioModuleKey, number>();
    const activeModules = new Set<PortfolioModuleKey>();
    const pendingClicks: PortfolioModuleKey[] = [];
    const pendingActions: Array<"contact" | "resume" | "github" | "gitee"> = [];
    let pendingEntryModule: PortfolioModuleKey | undefined;
    let entryModuleCaptured = false;
    const endpoint = "/api/radar/engagement";

    try {
      const initialId = decodeURIComponent(window.location.hash.slice(1));
      const initialKey = document.getElementById(initialId)?.dataset.moduleKey;
      if (initialKey && moduleKeys.has(initialKey)) {
        pendingEntryModule = initialKey as PortfolioModuleKey;
        entryModuleCaptured = true;
      }
    } catch {
      // Ignore malformed hashes; the first visible section will be used instead.
    }

    function tick() {
      const now = Date.now();
      const elapsed = Math.min(Math.max(0, now - lastTick), 60_000);
      lastTick = now;
      if (!wasVisible || elapsed === 0) return;
      totalMilliseconds += elapsed;
      for (const key of activeModules) moduleMilliseconds.set(key, (moduleMilliseconds.get(key) ?? 0) + elapsed);
    }

    function send(payload: { visitKey: string; durationSeconds: number; clicks: PortfolioModuleKey[]; dwellSeconds: Partial<Record<PortfolioModuleKey, number>>; entryModuleKey?: PortfolioModuleKey; actions: Array<"contact" | "resume" | "github" | "gitee"> }) {
      const body = JSON.stringify(payload);
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon(endpoint, blob)) {
        void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
      }
    }

    function flush() {
      const durationSeconds = Math.min(60, Math.floor(totalMilliseconds / 1000));
      totalMilliseconds -= durationSeconds * 1000;
      const dwellSeconds: Partial<Record<PortfolioModuleKey, number>> = {};
      for (const [key, milliseconds] of moduleMilliseconds) {
        const seconds = Math.min(60, Math.floor(milliseconds / 1000));
        if (seconds > 0) {
          dwellSeconds[key] = seconds;
          moduleMilliseconds.set(key, milliseconds - seconds * 1000);
        }
      }
      const clicks = pendingClicks.splice(0, 64);
      const actions = pendingActions.splice(0, 32);
      if (durationSeconds === 0 && clicks.length === 0 && Object.keys(dwellSeconds).length === 0 && !pendingEntryModule && actions.length === 0) return;
      const entryModuleKey = pendingEntryModule;
      pendingEntryModule = undefined;
      send({ visitKey, durationSeconds, clicks, dwellSeconds, entryModuleKey, actions });
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest<HTMLElement>("[data-visitor-action]")?.dataset.visitorAction;
      if (action && visitorActions.has(action)) pendingActions.push(action as "contact" | "resume" | "github" | "gitee");
      const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const moduleKey = document.getElementById(decodeURIComponent(id))?.dataset.moduleKey;
      if (moduleKey && moduleKeys.has(moduleKey)) pendingClicks.push(moduleKey as PortfolioModuleKey);
    }

    function handleVisibilityChange() {
      tick();
      wasVisible = document.visibilityState !== "hidden";
      if (!wasVisible) flush();
    }

    function handlePageHide() {
      tick();
      flush();
    }

    const observer = new IntersectionObserver((entries) => {
      tick();
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.moduleKey;
        if (!key || !moduleKeys.has(key)) continue;
        const visibleArea = entry.intersectionRect.height / Math.max(window.innerHeight, 1);
        if (!entryModuleCaptured && entry.isIntersecting && visibleArea >= 0.15) {
          pendingEntryModule = key as PortfolioModuleKey;
          entryModuleCaptured = true;
        }
        if (entry.isIntersecting && visibleArea >= 0.15) activeModules.add(key as PortfolioModuleKey);
        else activeModules.delete(key as PortfolioModuleKey);
      }
    }, { threshold: [0, 0.15, 0.3, 0.5] });

    document.querySelectorAll<HTMLElement>("[data-module-key]").forEach((section) => observer.observe(section));
    document.addEventListener("click", handleClick, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    const interval = window.setInterval(() => { tick(); flush(); }, 5000);

    return () => {
      tick();
      flush();
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
    };
  }, [initialVisitKey]);

  return null;
}
