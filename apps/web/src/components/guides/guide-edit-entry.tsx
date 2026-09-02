"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";
import { isAdminRole } from "@/lib/me";

/**
 * 攻略编辑入口（客户端）：仅对攻略作者本人或 admin 渲染「编辑」链接，
 * 其余访客不渲染任何内容。
 */

interface Me {
  id: string;
  role?: string;
}

export function GuideEditEntry({
  slug,
  authorId,
}: {
  slug: string;
  authorId: string;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) return;
    request<{ data: Me }>("/users/me")
      .then((r) => {
        const isAuthor = r.data.id === authorId;
        const isAdmin = isAdminRole(r.data.role);
        setAllowed(isAuthor || isAdmin);
      })
      .catch(() => setAllowed(false));
  }, [authorId]);

  if (!allowed) return null;

  return (
    <Link
      href={`/guides/${slug}/edit`}
      className="rounded-sm border border-border-subtle px-2 py-0.5 font-mono text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
    >
      编辑
    </Link>
  );
}
