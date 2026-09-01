"use client";

import Link from "next/link";

/**
 * Wiki 编辑入口（客户端，契约 PR #51）。
 * - 编辑：admin / editor / owner 角色
 * - 新建：上述角色，或被站长授予 wikiCreateGranted 的成员
 * 其余访客不渲染任何内容（避免暴露无权限操作）。
 */

import { useMe } from "@/lib/me";

const EDITOR_ROLES = new Set(["admin", "editor", "owner"]);

export function WikiEditEntry({
  variant,
  slug,
}: {
  variant: "new" | "edit";
  slug?: string;
}) {
  const { me, pending } = useMe();

  if (pending || !me) return null;

  const role = me.role?.toLowerCase() ?? "";
  const allowed =
    variant === "edit"
      ? EDITOR_ROLES.has(role)
      : EDITOR_ROLES.has(role) || me.wikiCreateGranted === true;

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
