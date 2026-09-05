"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  feedbackApi,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { Avatar } from "@/components/avatar";
import { useMe } from "@/lib/me";

/**
 * 反馈处理队列（/admin/feedback，契约 PR #108 A 组）：
 * - 查看权限：站长或 manage_content；回复/关闭仅站长
 * - 队列 PENDING 优先排序，可按状态筛选
 * - 回复（≤1000 字）后经站内信通知提交人；也可直接关闭
 */

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: "问题反馈",
  suggestion: "功能建议",
  appeal: "内容申诉",
  other: "其他",
};

const STATUS_META: Record<FeedbackStatus, { label: string; cls: string }> = {
  PENDING: { label: "待处理", cls: "border-amber-soft/60 text-amber" },
  REPLIED: { label: "已回复", cls: "border-success/60 text-success" },
  CLOSED: { label: "已关闭", cls: "border-border-subtle text-faint" },
};

const FILTERS: { key: FeedbackStatus | ""; label: string }[] = [
  { key: "", label: "全部" },
  { key: "PENDING", label: "待处理" },
  { key: "REPLIED", label: "已回复" },
  { key: "CLOSED", label: "已关闭" },
];

export function FeedbackQueue() {
  const { me, pending } = useMe();
  const [filter, setFilter] = useState<FeedbackStatus | "">("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 回复/关闭操作态
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [acting, setActing] = useState(false);
  const [actErr, setActErr] = useState("");

  // 反馈队列仅站长可见可处理（后端 admin/feedback 仅 owner）
  const canView = !!me && me.role?.toLowerCase() === "owner";
  const isOwner = me?.role?.toLowerCase() === "owner";

  const load = useCallback((status: FeedbackStatus | "", p: number) => {
    setLoading(true);
    setErr("");
    feedbackApi
      .adminList(status || undefined, p, 15)
      .then((r) => {
        // PENDING 优先（同状态按时间倒序，后端默认序）
        const sorted = [...r.data].sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === "PENDING" ? -1 : b.status === "PENDING" ? 1 : 0;
        });
        setItems(sorted);
        setHasMore(r.pagination.hasMore);
      })
      .catch(() => setErr("反馈队列加载失败，后端可能未在线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canView) load(filter, page);
  }, [canView, filter, page, load]);

  if (pending) return null;
  if (!me) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 管理员账号。
      </p>
    );
  }
  if (!canView) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        当前账号无反馈查看权限（需站长或 manage_content 开关）。
      </p>
    );
  }

  const act = (id: string, status: "REPLIED" | "CLOSED") => {
    if (acting) return;
    if (status === "REPLIED" && !replyText.trim()) {
      setActErr("回复内容不能为空。");
      return;
    }
    setActing(true);
    setActErr("");
    feedbackApi
      .handle(id, status, status === "REPLIED" ? replyText.trim() : undefined)
      .then((saved) => {
        setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...saved } : f)));
        setReplyFor(null);
        setReplyText("");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setActErr("仅站长可以回复或关闭反馈。");
        } else {
          setActErr(
            e instanceof ApiError
              ? (e.problem.detail ?? "操作失败，请稍后重试。")
              : "操作失败，请稍后重试。",
          );
        }
      })
      .finally(() => setActing(false));
  };

  return (
    <div className="space-y-4">
      {/* 状态筛选 */}
      <div
        role="tablist"
        aria-label="反馈状态筛选"
        className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              filter === f.key
                ? "bg-raised font-medium text-primary"
                : "text-secondary hover:text-amber"
            }`}
          >
            {f.label}
          </button>
        ))}
        {!isOwner && (
          <span className="ml-auto self-center text-caption text-faint">
            仅站长可回复 / 关闭
          </span>
        )}
      </div>

      <div className="rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : err ? (
          <p role="alert" className="p-6 text-center text-small text-faint">
            {err}
          </p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">
            当前筛选下没有反馈。
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((f) => {
              const st = STATUS_META[f.status] ?? STATUS_META.PENDING;
              const name = f.author?.displayName ?? f.author?.username ?? "未知用户";
              return (
                <li key={f.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar url={f.author?.avatarUrl} name={name} size="sm" />
                    <span className="text-small font-medium text-primary">{name}</span>
                    <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-secondary">
                      {CATEGORY_LABEL[f.category] ?? f.category}
                    </span>
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 font-mono text-caption ${st.cls}`}
                    >
                      {st.label}
                    </span>
                    <time className="font-mono text-caption text-faint">
                      {new Date(f.createdAt).toLocaleString("zh-CN")}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-small text-primary">
                    {f.content}
                  </p>

                  {f.replyText && (
                    <div className="mt-3 rounded-md border border-amber-soft/40 bg-raised px-4 py-3">
                      <p className="flex items-center gap-2 text-caption text-amber">
                        我的回复
                        {f.repliedAt && (
                          <time className="font-mono text-faint">
                            {new Date(f.repliedAt).toLocaleString("zh-CN")}
                          </time>
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-small text-secondary">
                        {f.replyText}
                      </p>
                    </div>
                  )}

                  {/* 站长操作：回复 / 关闭（仅待处理与已回复可再操作） */}
                  {isOwner && f.status !== "CLOSED" && (
                    <div className="mt-3">
                      {replyFor === f.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            maxLength={1000}
                            rows={3}
                            placeholder="回复内容将以站内信发送给提交人（≤1000 字）…"
                            className="w-full resize-y rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
                          />
                          {actErr && (
                            <p role="alert" className="text-caption text-danger">
                              {actErr}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={acting || !replyText.trim()}
                              onClick={() => act(f.id, "REPLIED")}
                              className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                            >
                              {acting ? "发送中…" : "回复并通知"}
                            </button>
                            <button
                              type="button"
                              disabled={acting}
                              onClick={() => {
                                setReplyFor(null);
                                setReplyText("");
                                setActErr("");
                              }}
                              className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyFor(f.id);
                              setReplyText("");
                              setActErr("");
                            }}
                            className="rounded-md border border-amber-soft px-3 py-1.5 text-caption text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
                          >
                            {f.status === "REPLIED" ? "再次回复" : "回复"}
                          </button>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => act(f.id, "CLOSED")}
                            className="rounded-md border border-border-subtle px-3 py-1.5 text-caption text-secondary transition-colors duration-fast hover:border-danger hover:text-danger"
                          >
                            关闭
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              ← 上一页
            </button>
            <span className="font-mono text-caption text-faint">第 {page} 页</span>
            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
