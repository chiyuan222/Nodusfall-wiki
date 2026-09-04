"use client";

import { useAppearanceLoader } from "@/lib/appearance";

/** 根布局挂载点：首屏拉取全站标题外观配置并注入 CSS 变量（无 UI） */
export function AppearanceLoader() {
  useAppearanceLoader();
  return null;
}
