"use client";

import { useEffect, useState } from "react";
import { siteApi, type FloatingWindowConfig, type FloatingWindows } from "@/lib/api";

/**
 * 论坛页左右漂浮引流窗（契约 PR #70）。
 * - 配置来自 GET /site/floating-windows（匿名可读；后端未上线时不渲染）
 * - 仅 xl 及以上显示（避免遮挡移动端内容）
 * - 可关闭，关闭状态按「侧边+图片地址」记忆到 localStorage（换图后自动重新出现）
 * - 点击跳外链（target=_blank rel=noopener noreferrer）
 */

const DISABLED: FloatingWindowConfig = { enabled: false, imageUrl: null, linkUrl: null };

function useFloatingConfig(): FloatingWindows | null {
  const [config, setConfig] = useState<FloatingWindows | null>(null);
  useEffect(() => {
    siteApi
      .floatingWindows()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);
  return config;
}

function FloatWindow({
  side,
  config,
}: {
  side: "left" | "right";
  config: FloatingWindowConfig;
}) {
  const storageKey = `nodusfall.float.closed.${side}.${config.imageUrl}`;
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      setClosed(!!localStorage.getItem(storageKey));
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [storageKey]);

  if (!config.enabled || !config.imageUrl || closed) return null;

  const close = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setClosed(true);
  };

  const sideCls = side === "left" ? "left-3" : "right-3";

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- 管理员配置的外链引流图（二维码等）
    <img
      src={config.imageUrl}
      alt={side === "left" ? "引流图（左）" : "引流图（右）"}
      loading="lazy"
      className="w-28 rounded-md border border-border-subtle object-cover shadow-card transition-colors duration-fast group-hover:border-amber-soft xl:w-32"
    />
  );

  return (
    <aside
      aria-label={side === "left" ? "左侧引流窗" : "右侧引流窗"}
      className={`fixed top-1/3 z-30 hidden xl:block ${sideCls}`}
    >
      <div className="group relative">
        {config.linkUrl ? (
          <a href={config.linkUrl} target="_blank" rel="noopener noreferrer">
            {img}
          </a>
        ) : (
          img
        )}
        <button
          type="button"
          aria-label="关闭"
          onClick={close}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle bg-surface text-caption text-faint shadow-card transition-colors duration-fast hover:border-danger hover:text-danger"
        >
          ×
        </button>
      </div>
    </aside>
  );
}

export function FloatingWindows() {
  const config = useFloatingConfig();
  if (!config) return null;
  return (
    <>
      <FloatWindow side="left" config={config.left ?? DISABLED} />
      <FloatWindow side="right" config={config.right ?? DISABLED} />
    </>
  );
}
