"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector(".developerfolio-site")?.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("offerfolio-theme");
    const initial: Theme = saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
    const syncTheme = () => {
      const current = window.localStorage.getItem("offerfolio-theme");
      if (current === "dark" || current === "light") setTheme(current);
    };
    window.addEventListener("offerfolio-theme-change", syncTheme);
    return () => window.removeEventListener("offerfolio-theme-change", syncTheme);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("offerfolio-theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event("offerfolio-theme-change"));
  }

  return <button className="df-theme-toggle" type="button" aria-label={theme === "dark" ? "切换为浅色模式" : "切换为深色模式"} onClick={toggleTheme}><span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span></button>;
}
