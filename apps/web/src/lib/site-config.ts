"use client";

import { useEffect, useState } from "react";
import { siteApi, type SiteSections } from "./api";

/**
 * 站点分区显示开关共享钩子（契约 PR #70）。
 * - 模块级共享一次请求（导航 / 门控 / 底栏同时挂载不重复拉取）
 * - 加载中或后端未上线时默认全开（宁可多显示，不误伤可用性）
 * - 管理页保存后调用 invalidateSiteSections() 强制下次重取
 */

export const ALL_SECTIONS_ON: SiteSections = {
  home: true,
  world: true,
  wiki: true,
  guides: true,
  forum: true,
  videos: true,
};

let cached: SiteSections | null = null;
let inflight: Promise<SiteSections> | null = null;
const listeners = new Set<() => void>();

function fetchSections(): Promise<SiteSections> {
  inflight ??= siteApi
    .sections()
    .then((s) => {
      cached = { ...ALL_SECTIONS_ON, ...s };
      return cached;
    })
    .catch(() => ALL_SECTIONS_ON)
    .finally(() => {
      inflight = null;
      listeners.forEach((fn) => fn());
    });
  return inflight;
}

/** 管理端保存后调用：清缓存并通知所有订阅组件重取 */
export function invalidateSiteSections() {
  cached = null;
  fetchSections();
}

export function useSiteSections(): SiteSections {
  const [state, setState] = useState<SiteSections>(cached ?? ALL_SECTIONS_ON);

  useEffect(() => {
    const onUpdate = () => setState(cached ?? ALL_SECTIONS_ON);
    listeners.add(onUpdate);
    if (!cached) fetchSections();
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return state;
}
