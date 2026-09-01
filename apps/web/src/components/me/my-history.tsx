"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";
import type { components } from "@/lib/schema";

/**
 * 浏览记录（客户端组件）：GET /users/me/history，DELETE 清空（契约 PR #45）。
 * 上报由详情页 HistoryReporter 在挂载时完成。
 */

type HistoryEntry = components["schemas"]["HistoryEntry"];

const KIND_LABEL: Record<HistoryEntry["kind"], string> = {
  wikiPage: "Wiki",
  guide: "攻略",
  forumThread: "论坛",
};

function hrefOf(e: HistoryEntry): string {
  switch (e.kind) {
    case "wikiPage":
      return `/wiki/${e.slug}`;
    case "guide":
      return `/guides/${e.slug}`;
    case "forumThread":
      return `/forum/threads/${e.slug}`; // 契约：论坛 slug 传 threadId
  }
}

export function MyHistory() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  const load = useCallback((p: number) => {
    setLoading(true);
    setErr("");
    request<ListResult<HistoryEntry>>("/users/me/history", {
      query: { page: p, perPage: 10 },
    })
      .then((r) => {
        setItems(r.data);
        setHasMore(r.pagination.hasMore);
      })
      .catch(() => setErr("加载失败，后端可能未在线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loggedIn) load(page);
  }, [loggedIn, page, load]);

  if (!loggedIn) return null;

  const clearAll = () => {
    if (clearing || items.length === 0) return;
    if (!window.confirm("确定清空全部浏览记录？此操作不可恢复。")) return;
    setClearing(true);
    request<void>("/users/me/history", { method: "DELETE" })
      .then(() => {
        setItems([]);
        setPage(1);
        setHasMore(false);
      })
      .catch(() => setErr("清空失败，请稍后重试。"))
      .finally(() => setClearing(false));
  };

  return (
    <div className="rounded-md border border-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <p className="text-caption text-faint">仅自己可见，按最近浏览倒序</p>
        <button
          type="button"
          disabled={clearing || items.length === 0}
          onClick={clearAll}
          className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-danger hover:text-danger disabled:opacity-40"
        >
          {clearing ? "清空中…" : "清空记录"}
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-center text-small text-faint">载入中…</p>
      ) : err ? (
        <p role="alert" className="p-6 text-center text-small text-faint">
          {err}
        </p>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-small text-faint">
          还没有浏览记录，去逛逛 Wiki 和攻略吧。
        </p>
      ) : (
        <ol className="divide-y divide-border-subtle">
          {items.map((e) => (
            <li key={e.id}>
              <Link
                href={hrefOf(e)}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors duration-fast hover:bg-raised"
              >
                <span className="min-w-0 grow">
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                      {KIND_LABEL[e.kind]}
                    </span>
                    <span className="truncate text-body font-medium text-primary group-hover:text-amber">
                      {e.title}
                    </span>
                  </span>
                  {e.excerpt && (
                    <span className="mt-0.5 line-clamp-1 block text-small text-secondary">
                      {e.excerpt}
                    </span>
                  )}
                  <span className="mt-0.5 block font-mono text-caption text-faint">
                    浏览于 {new Date(e.viewedAt).toLocaleString("zh-CN")}
                  </span>
                </span>
                {e.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- 契约列表级封面图
                  <img
                    src={e.coverImage}
                    alt=""
                    loading="lazy"
                    className="h-14 w-24 shrink-0 rounded-sm border border-border-subtle object-cover"
                  />
                )}
              </Link>
            </li>
          ))}
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
            className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  );
}
