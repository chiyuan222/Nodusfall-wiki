"use client";

import { useEffect } from "react";
import { siteApi, type AppearanceHeading } from "./api";

/**
 * 全站标题外观（契约 PR #101）：
 * - 页面加载时 GET /site/appearance，把非 null 项注入 <html> 的 CSS 变量
 *   （--heading-color / --heading-font / --heading-weight）并按字段打
 *   data-heading-color / data-heading-font / data-heading-weight 属性门；
 *   globals.css 末尾的覆盖规则仅在对应属性存在时生效，未配置字段保持主题默认
 * - 管理端保存后调用 invalidateAppearance() 立即重取并全站生效
 */

const FONT_STACKS: Record<NonNullable<AppearanceHeading["fontFamily"]>, string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  kaiti: '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif',
};

let cached: AppearanceHeading | null = null;
let inflight: Promise<AppearanceHeading | null> | null = null;
const listeners = new Set<() => void>();

function applyToRoot(h: AppearanceHeading | null) {
  const root = document.documentElement;
  const setVar = (name: string, value: string | null, gate: string) => {
    if (value == null) {
      root.style.removeProperty(name);
      delete root.dataset[gate];
    } else {
      root.style.setProperty(name, value);
      root.dataset[gate] = "1";
    }
  };
  setVar("--heading-color", h?.color ?? null, "headingColor");
  setVar(
    "--heading-font",
    h?.fontFamily ? FONT_STACKS[h.fontFamily] : null,
    "headingFont",
  );
  setVar(
    "--heading-weight",
    h?.fontWeight != null ? String(h.fontWeight) : null,
    "headingWeight",
  );
}

function fetchAppearance(): Promise<AppearanceHeading | null> {
  inflight ??= siteApi
    .appearance()
    .then((cfg) => {
      cached = cfg.heading ?? null;
      return cached;
    })
    .catch(() => null) // 后端未上线时保持主题默认
    .finally(() => {
      inflight = null;
      if (typeof document !== "undefined") applyToRoot(cached);
      listeners.forEach((fn) => fn());
    });
  return inflight;
}

/** 管理端保存后调用：清缓存、重取并立即注入 :root */
export function invalidateAppearance() {
  cached = null;
  return fetchAppearance();
}

/** 挂载于根布局：首屏拉取一次标题外观并注入 CSS 变量 */
export function useAppearanceLoader() {
  useEffect(() => {
    if (!cached) fetchAppearance();
    else applyToRoot(cached);
    const onUpdate = () => applyToRoot(cached);
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);
}
