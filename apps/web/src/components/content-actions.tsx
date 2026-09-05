"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useMe, hasPermission } from "@/lib/me";

/**
 * 内容操作按钮（规范 docs/design/content-action-buttons.md，契约 PR #51/#53，权限体系 v2 PR #119）。
 *
 * 显示规则：
 * - 未登录：不渲染
 * - 自己的内容：「删除」
 * - 他人内容（管理人员）：按权限开关独立显示——
 *   对应分区 manage_*_board / manage_all_boards / manage_content →「删除」；
 *   manage_users →「封禁作者」；都没开 → 不渲染（admin/owner 默认全开）
 * - 删除：二次确认 → DELETE → 跳转所属列表页
 * - 封禁：确认弹窗 → PATCH /admin/users/{authorId} {status:"banned"} → 刷新
 */

type Kind = "wiki" | "guide" | "thread";

interface Props {
  kind: Kind;
  /** wiki/guide 传 slug；thread 传 threadId */
  target: string;
  author: { id: string; displayName: string };
  /** thread 删除成功后跳转所属板块；wiki/guide 忽略 */
  boardSlug?: string;
}

const DELETE_LABEL: Record<Kind, string> = {
  wiki: "删除词条",
  guide: "删除攻略",
  thread: "删除主题",
};

const DELETE_PATH: Record<Kind, (t: string) => string> = {
  wiki: (s) => `/wiki/pages/${s}`,
  guide: (s) => `/guides/${s}`,
  thread: (id) => `/forum/threads/${id}`,
};

const btnCls =
  "rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-danger hover:text-danger disabled:opacity-40";

export function ContentActions({ kind, target, author, boardSlug }: Props) {
  const router = useRouter();
  const { me, pending } = useMe();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (pending || !me) return null;

  const isSelf = me.id === author.id;
  // 权限体系 v2（PR #119）：删除他人内容需对应分区/全局内容管理权限；封禁需 manage_users
  const BOARD_PERM = {
    wiki: "manage_wiki_board",
    guide: "manage_guide_board",
    thread: "manage_forum_board",
  } as const;
  const canDeleteOther =
    !isSelf &&
    (hasPermission(me, BOARD_PERM[kind]) ||
      hasPermission(me, "manage_all_boards") ||
      hasPermission(me, "manage_content"));
  const canBanAuthor = !isSelf && hasPermission(me, "manage_users");

  if (!isSelf && !canDeleteOther && !canBanAuthor) return null;

  const doDelete = () => {
    if (busy) return;
    if (!window.confirm(`确认${DELETE_LABEL[kind]}？此操作不可撤销。`)) return;
    setBusy(true);
    setMsg("");
    request<void>(DELETE_PATH[kind](target), { method: "DELETE" })
      .then(() => {
        router.push(kind === "thread" ? `/forum/${boardSlug ?? ""}` : `/${kind === "wiki" ? "wiki" : "guides"}`);
        router.refresh();
      })
      .catch((e: unknown) => {
        setMsg(
          e instanceof ApiError && e.status === 403
            ? "无权限删除该内容。"
            : "删除失败，请稍后重试。",
        );
        setBusy(false);
      });
  };

  const doBan = () => {
    if (busy) return;
    if (!window.confirm(`确认封禁作者「${author.displayName}」？封禁后该账号无法登录访问，已发布内容保留并显示受限标识。`)) return;
    setBusy(true);
    setMsg("");
    request(`/admin/users/${author.id}`, {
      method: "PATCH",
      body: { status: "banned" },
    })
      .then(() => router.refresh())
      .catch((e: unknown) => {
        setMsg(
          e instanceof ApiError && e.status === 403
            ? "无权限封禁用户（需 manage_users 开关）。"
            : "封禁失败，请稍后重试。",
        );
        setBusy(false);
      });
  };

  return (
    <span className="ml-auto flex flex-wrap items-center gap-2">
      {(isSelf || canDeleteOther) && (
        <button type="button" onClick={doDelete} disabled={busy} className={btnCls}>
          {DELETE_LABEL[kind]}
        </button>
      )}
      {canBanAuthor && (
        <button type="button" onClick={doBan} disabled={busy} className={btnCls}>
          封禁作者
        </button>
      )}
      {msg && <span role="alert" className="text-caption text-danger">{msg}</span>}
    </span>
  );
}
