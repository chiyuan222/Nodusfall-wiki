"use client";

/**
 * 美术主题切换：结绳源点（默认深色）/ 冷峻星轨（深蓝）/ 静默神谕（浅色）。
 * 选择持久化到 localStorage，key 与 layout.tsx 中的初始化脚本共享。
 */

import { useEffect, useState } from "react";

export const THEMES = [
  { id: "origin", name: "结绳源点", swatch: "#d9a441" },
  { id: "starlight", name: "冷峻星轨", swatch: "#7fa8d9" },
  { id: "oracle", name: "静默神谕", swatch: "#a67c1e" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "nodusfall.theme.v1";

function applyTheme(id: ThemeId) {
  if (id === "origin") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = id;
  }
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeId>("origin");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "starlight" || stored === "oracle") setTheme(stored);
  }, []);

  const select = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    if (id === "origin") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="美术主题"
      className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          aria-label={`切换到「${t.name}」主题`}
          title={t.name}
          onClick={() => select(t.id)}
          className={`flex items-center gap-2 rounded-md text-caption transition-colors duration-fast ${
            compact ? "p-1.5" : "px-2.5 py-1.5"
          } ${
            theme === t.id
              ? "bg-raised text-primary"
              : "text-faint hover:bg-raised hover:text-secondary"
          }`}
        >
          <span
            aria-hidden
            className="block h-3 w-3 rounded-full border border-border-subtle"
            style={{ background: t.swatch }}
          />
          {!compact && t.name}
        </button>
      ))}
    </div>
  );
}
