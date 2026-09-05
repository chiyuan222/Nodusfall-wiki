"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useMe, isAdminRole, hasPermission } from "@/lib/me";
import { AuthorDiscipline } from "@/components/admin/author-discipline";
import type { components } from "@/lib/schema";

/**
 * 论坛主题内容管理（/admin/boards 论坛 Tab 下半区，权限体系 v2 批次）。
 * - 逐板块列出主题：GET /forum/boards/{slug}/threads
 * - 行内操作：置顶/锁定（PATCH /forum/threads/{id} {pinned, locked}）、删除（DELETE）、处置作者
 * - 门禁：manage_forum_board / manage_all_boards / admin / owner；
 *   论坛未开放（404）时保留占位提示，站长/总管理仍可用其余操作
 */

type Board = components["schemas"]["ForumBoard"];
type Thread = components["schemas"]["ForumThreadSummary"];

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 403) return "权限不足。";
    if (e.status === 404) return "主题不存在或已删除，请刷新列表。";
    return e.problem.detail ?? e.problem.title;
  }
  return "无法连接后端。";
}

export function ForumThreadAdmin() {
  const { me, pending } = useMe();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardSlug, setBoardSlug] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [boardsMissing, setBoardsMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");

  const allowed =
    !!me &&
    (isAdminRole(me.role) ||
      hasPermission(me, "manage_all_boards") ||
      hasPermission(me, "manage_forum_board"));

  useEffect(() => {
    if (!allowed) return;
    request<{ data: Board[] }>("/forum/boards", { auth: false })
      .then((r) => {
        const list = [...r.data].sort((a, b) => a.sortOrder - b.sortOrder);
        setBoards(list);
        setBoardSlug((cur) => cur || list[0]?.slug || "");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setBoardsMissing(true);
        else setMsg("板块列表加载失败。");
      });
  }, [allowed]);

  const loadThreads = useCallback((slug: string) => {
    if (!slug) {
      setThreads([]);
      return;
    }
    setLoading(true);
    setMsg("");
    request<ListResult<Thread>>(`/forum/boards/${slug}/threads`, {
      auth: false,
      query: { sort: "lastPostAt", perPage: 50 },
    })
      .then((r) => setThreads(r.data))
      .catch((e: unknown) => setMsg(describeError(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (allowed && boardSlug) loadThreads(boardSlug);
  }, [allowed, boardSlug, loadThreads]);

  const patchThread = (t: Thread, body: Record<string, unknown>) => {
    if (busyId) return;
    setBusyId(t.id);
    setMsg("");
    request<{ data: Thread }>(`/forum/threads/${t.id}`, { method: "PATCH", body })
      .then(() => loadThreads(boardSlug))
      .catch((e: unknown) => setMsg(describeError(e)))
      .finally(() => setBusyId(""));
  };

  const removeThread = (t: Thread) => {
    if (busyId) return;
    if (!window.confirm(`确定删除主题「${t.title}」吗？其下回复将一并移除，不可撤销。`))
      return;
    setBusyId(t.id);
    setMsg("");
    request<void>(`/forum/threads/${t.id}`, { method: "DELETE" })
      .then(() => loadThreads(boardSlug))
      .catch((e: unknown) => setMsg(describeError(e)))
      .finally(() => setBusyId(""));
  };

  if (pending) return null;
  if (!allowed) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        当前账号无论坛分区管理权限。
      </p>
    );
  }

  const btnCls =
    "rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h3 font-semibold">主题内容管理</h3>
        {boardsMissing && (
          <span className="rounded-sm border border-amber-soft px-2 py-0.5 font-mono text-caption text-amber">
            论坛未开放
          </span>
        )}
        <select
          aria-label="选择板块"
          value={boardSlug}
          onChange={(e) => setBoardSlug(e.target.value)}
          className="rounded-md border border-border-subtle bg-raised px-3 py-1.5 text-small text-primary focus:border-amber-soft focus:outline-none"
        >
          {boards.length === 0 && <option value="">（暂无板块）</option>}
          {boards.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}（{b.threadCount} 主题）
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <p role="alert" className="rounded-md border border-danger/40 bg-surface px-4 py-2 text-small text-danger">
          {msg}
        </p>
      )}

      <div className="overflow-hidden rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : threads.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">
            {boardSlug ? "该板块暂无主题。" : "请先创建板块。"}
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {threads.map((t) => (
              <li key={t.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {t.pinned && (
                    <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
                      置顶
                    </span>
                  )}
                  {t.locked && (
                    <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
                      锁定
                    </span>
                  )}
                  <Link
                    href={`/forum/threads/${t.id}`}
                    target="_blank"
                    className="min-w-0 truncate text-small font-medium text-primary hover:text-amber"
                  >
                    {t.title}
                  </Link>
                  <span className="font-mono text-caption text-faint">
                    {t.author.displayName} · 回复 {t.replyCount} ·{" "}
                    {t.updatedAt.slice(0, 10)}
                  </span>
                  <span className="grow" />
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => patchThread(t, { pinned: !t.pinned })}
                    className={btnCls}
                  >
                    {t.pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => patchThread(t, { locked: !t.locked })}
                    className={btnCls}
                  >
                    {t.locked ? "解锁" : "锁定"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => removeThread(t)}
                    className={`${btnCls} hover:border-danger hover:text-danger`}
                  >
                    删除
                  </button>
                  <AuthorDiscipline
                    author={{
                      id: t.author.id,
                      displayName: t.author.displayName,
                      username: t.author.username,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
