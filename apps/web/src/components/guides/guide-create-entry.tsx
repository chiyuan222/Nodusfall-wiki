"use client";

import Link from "next/link";
import { useMe, hasPermission, isAdminRole } from "@/lib/me";

/**
 * 攻略页「＋ 撰写攻略」入口（权限体系 v2）：
 * admin/owner、攻略小编/版主、manage_guide_board 或 guideCreateGranted 可见。
 */
export function GuideCreateEntry() {
  const { me, pending } = useMe();
  if (pending || !me) return null;
  const ok =
    isAdminRole(me.role) ||
    me.role === "guide_editor" ||
    me.role === "guide_moderator" ||
    hasPermission(me, "manage_guide_board") ||
    me.guideCreateGranted === true;
  if (!ok) return null;
  return (
    <Link
      href="/editor/guide/new"
      className="rounded-md border border-amber-soft px-4 py-1.5 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
    >
      ＋ 撰写攻略
    </Link>
  );
}
