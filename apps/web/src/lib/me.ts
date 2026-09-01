"use client";

import { useEffect, useState } from "react";
import { request } from "./api-client";
import { getAccessToken } from "./session";
import type { components } from "./schema";

/**
 * 当前登录用户（客户端共享钩子，契约 PR #45/#51）。
 * 返回 User（含 group/level/permissions/wikiCreateGranted/status 等）；
 * 未登录或探测失败返回 null。pending=true 表示尚未完成首次探测。
 */

export type MeUser = components["schemas"]["User"];

export interface MeState {
  me: MeUser | null;
  pending: boolean;
}

export function useMe(): MeState {
  const [state, setState] = useState<MeState>({ me: null, pending: true });

  useEffect(() => {
    if (!getAccessToken()) {
      setState({ me: null, pending: false });
      return;
    }
    request<{ data: MeUser }>("/users/me")
      .then((r) => setState({ me: r.data, pending: false }))
      .catch(() => setState({ me: null, pending: false }));
  }, []);

  return state;
}

/** 是否有管理身份（admin/owner；契约 role 枚举已含 owner） */
export function isAdminRole(role?: string): boolean {
  const r = role?.toLowerCase();
  return r === "admin" || r === "owner";
}

/** 是否具备某个管理权限开关（owner/admin 默认可进管理页；开关细化到按钮级） */
export function hasPermission(
  me: MeUser | null,
  key: components["schemas"]["User"]["permissions"] extends (infer P)[] | undefined
    ? P
    : never,
): boolean {
  if (!me) return false;
  if (isAdminRole(me.role)) return true;
  return (me.permissions ?? []).includes(key as never);
}

/** 是否可发言（评论/发帖）：normal 组仅浏览；muted/banned 受限（契约 PR #51） */
export function canPost(me: MeUser | null): boolean {
  if (!me) return false;
  if (me.status === "muted" || me.status === "banned" || me.status === "deleted")
    return false;
  if (isAdminRole(me.role)) return true;
  return me.group !== "normal";
}
