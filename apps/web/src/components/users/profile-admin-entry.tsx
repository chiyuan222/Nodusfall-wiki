"use client";

import Link from "next/link";
import { useMe, hasPermission } from "@/lib/me";

/**
 * 他人主页的「用户管理」入口（契约 PR #141）：
 * 拥有 manage_users 的角色且非本人主页时显示，跳转 /admin/users 并预填搜索。
 */
export function ProfileAdminEntry({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const { me, pending } = useMe();
  if (pending || !me || me.id === userId) return null;
  if (!hasPermission(me, "manage_users")) return null;
  return (
    <Link
      href={`/admin/users?q=${encodeURIComponent(username)}`}
      className="shrink-0 rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
    >
      用户管理 →
    </Link>
  );
}
