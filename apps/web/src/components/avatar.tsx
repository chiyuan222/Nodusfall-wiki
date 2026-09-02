"use client";

import { useState } from "react";

/**
 * 用户头像（圆形）：有 avatarUrl 显示图片，加载失败或无头像时降级为
 * 首字符占位（与资料卡占位风格一致：琥珀色描边 + 衬线字）。
 */

export function Avatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [broken, setBroken] = useState(false);

  const sizeCls =
    size === "sm"
      ? "h-8 w-8 text-small"
      : size === "lg"
        ? "h-14 w-14 text-h2"
        : "h-10 w-10 text-body";

  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 用户自传头像，尺寸未知
      <img
        src={url}
        alt={`${name} 的头像`}
        onError={() => setBroken(true)}
        className={`${sizeCls} shrink-0 rounded-full border border-border-subtle object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${sizeCls} flex shrink-0 items-center justify-center rounded-full border border-amber-soft bg-raised font-serif text-amber`}
    >
      {(name || "?").slice(0, 1)}
    </span>
  );
}
