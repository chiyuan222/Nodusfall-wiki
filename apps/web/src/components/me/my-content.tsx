"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

/**
 * 用户中心「我的内容」：我发布的主题 / 我的收藏（客户端组件）。
 * 契约：GET /users/me/threads、GET /users/me/bookmarks（Bearer，返回 ForumThreadList）
 */

interface ThreadItem {
  id: string;
  boardSlug: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  likeCount: number;
  lastPostAt: string;
  coverImage: string | null;
}

type Tab = "threads" | "bookmarks";

const TAB_CONFIG: Record<
  Tab,
  { label: string; path: string; emptyText: string }
> = {
  threads: {
    label: "我发布的主题",
    path: "/users/me/threads",
    emptyText: "还没有发布过主题。",
  },
  bookmarks: {
    label: "我的收藏",
    path: "/users/me/bookmarks",
    emptyText: "还没有收藏任何主题。",
  },
};

export function MyContent() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("threads");
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  const load = useCallback((t: Tab, p: number) => {
    setLoading(true);
    setErr("");
    request<ListResult<ThreadItem>>(TAB_CONFIG[t].path, {
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
    if (loggedIn) load(tab, page);
  }, [loggedIn, tab, page, load]);

  // 未登录：资料卡已给出去登录入口，这里不再重复渲染
  if (!loggedIn) return null;

  const cfg = TAB_CONFIG[tab];

  return (
    <div className="rounded-md border border-border-subtle bg-surface">
      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-border-subtle p-2" role="tablist" aria-label="我的内容">
        {(Object.keys(TAB_CONFIG) as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setPage(1);
            }}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              tab === k
                ? "bg-raised font-medium text-primary"
                : "text-secondary hover:text-amber"
            }`}
          >
            {TAB_CONFIG[k].label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <p className="p-6 text-center text-small text-faint">载入中…</p>
      ) : err ? (
        <p className="p-6 text-center text-small text-faint">{err}</p>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-small text-faint">{cfg.emptyText}</p>
      ) : (
        <ol className="divide-y divide-border-subtle">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/threads/${t.id}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors duration-fast hover:bg-raised"
              >
                <span className="min-w-0 grow">
                  <span className="flex items-center gap-2">
                    {t.pinned && (
                      <span className="shrink-0 rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                        置顶
                      </span>
                    )}
                    {t.locked && (
                      <span className="shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
                        锁定
                      </span>
                    )}
                    <span className="truncate text-body font-medium text-primary group-hover:text-amber">
                      {t.title}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-caption text-faint">
                    {t.boardSlug} · 最后回复 {t.lastPostAt.slice(0, 10)}
                  </span>
                </span>
                {t.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- 契约列表级封面图
                  <img
                    src={t.coverImage}
                    alt=""
                    loading="lazy"
                    className="h-14 w-24 shrink-0 rounded-sm border border-border-subtle object-cover"
                  />
                )}
                <span className="flex shrink-0 items-center gap-4 text-center font-mono text-caption text-secondary">
                  <span>
                    <span className="block text-small text-primary">{t.replyCount}</span>
                    回复
                  </span>
                  <span>
                    <span className="block text-small text-primary">{t.likeCount}</span>
                    喜欢
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {/* 分页 */}
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
