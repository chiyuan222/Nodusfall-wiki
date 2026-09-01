"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout, request } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

/**
 * 顶栏登录态菜单（契约 PR #45）：
 * - 未登录：登录 / 注册按钮
 * - 已登录：头像/昵称下拉（用户中心、退出登录）
 * 挂载时探测一次会话；/users/me 401 视为未登录。
 */

interface MeBrief {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

export function AuthMenu() {
  const [me, setMe] = useState<MeBrief | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setChecked(true);
      return;
    }
    request<{ data: MeBrief }>("/users/me")
      .then((r) => setMe(r.data))
      .catch(() => setMe(null))
      .finally(() => setChecked(true));
  }, []);

  // 点击外部 / Esc 关闭下拉
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 探测前不渲染登录按钮，避免闪烁；占位同宽
  if (!checked) {
    return <span aria-hidden className="inline-block h-8 w-20" />;
  }

  if (!me) {
    return (
      <span className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-small text-secondary transition-colors duration-fast hover:bg-raised hover:text-primary"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          注册
        </Link>
      </span>
    );
  }

  const initial = (me.displayName || me.username).slice(0, 1);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border-subtle py-1 pl-1 pr-3 transition-colors duration-fast hover:border-amber-soft"
      >
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 用户自传头像
          <img
            src={me.avatarUrl}
            alt=""
            className="h-6 w-6 rounded-full border border-border-subtle object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-soft bg-raised text-caption text-amber"
          >
            {initial}
          </span>
        )}
        <span className="max-w-24 truncate text-small text-primary">
          {me.displayName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-border-subtle bg-surface p-1.5 shadow-card"
        >
          <Link
            role="menuitem"
            href="/me"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-small text-primary transition-colors duration-fast hover:bg-raised hover:text-amber"
          >
            用户中心
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void logout().then(() => {
                window.location.href = "/";
              });
            }}
            className="block w-full rounded-sm px-3 py-2 text-left text-small text-secondary transition-colors duration-fast hover:bg-raised hover:text-danger"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
