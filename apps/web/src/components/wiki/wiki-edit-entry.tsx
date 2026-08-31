"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

/**
 * Wiki 编辑入口（客户端）：仅对 admin / editor 角色渲染链接，
 * 其余访客不渲染任何内容（避免暴露无权限操作）。
 */

interface Me {
  role?: string;
}

const EDITOR_ROLES = new Set(["admin", "editor"]);

export function WikiEditEntry({
  variant,
  slug,
}: {
  variant: "new" | "edit";
  slug?: string;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) return;
    request<{ data: Me }>("/users/me")
      .then((r) => {
        const role = r.data.role?.toLowerCase() ?? "";
        setAllowed(EDITOR_ROLES.has(role));
      })
      .catch(() => setAllowed(false));
  }, []);

  if (!allowed) return null;

  if (variant === "new") {
    return (
      <Link
        href="/wiki/new"
        className="rounded-md border border-amber-soft px-4 py-1.5 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
      >
        ＋ 新建条目
      </Link>
    );
  }

  return (
    <Link
      href={`/wiki/${slug}/edit`}
      className="rounded-sm border border-border-subtle px-2 py-0.5 font-mono text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
    >
      编辑此页
    </Link>
  );
}
