"use client";

import Link from "next/link";
import { useMe, hasPermission } from "@/lib/me";
import type { Permission } from "@/lib/roles";

/**
 * 分区页「板块管理」入口（权限体系 v2 第二波）。
 * 仅当当前用户具备对应分区管理权限时显示（admin/owner 恒通过，
 * 版主/小编的默认权限由后端在 me.permissions 回填）。
 */
export function BoardManageEntry({
  perm,
  href,
  label = "板块管理",
}: {
  perm: Permission;
  href: string;
  label?: string;
}) {
  const { me, pending } = useMe();
  if (pending || !me || !hasPermission(me, perm)) return null;
  return (
    <Link
      href={href}
      className="rounded-md border border-border-subtle px-4 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
    >
      ⚙ {label}
    </Link>
  );
}
