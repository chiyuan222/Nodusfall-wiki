"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import type { components } from "@/lib/schema";

/**
 * 公开主页内容分区（契约 PR #141）：主题 / 评论 / 收藏 三个 Tab。
 * - 匿名可读；分区关闭（非本人）→ 403 → 「该用户未公开此栏目」
 * - 只含访问者可见内容（已发布/未删除/未下架）
 */

type Thread = components["schemas"]["ForumThreadSummary"];
type MyComment = components["schemas"]["MyComment"];
type Privacy = components["schemas"]["ProfilePrivacy"];

type TabKey = "threads" | "comments" | "bookmarks";

const TABS: { key: TabKey; label: string; privKey: keyof Privacy }[] = [
  { key: "threads", label: "主题", privKey: "showThreads" },
  { key: "comments", label: "评论", privKey: "showComments" },
  { key: "bookmarks", label: "收藏", privKey: "showBookmarks" },
];

const commentTargetUrl = (c: MyComment) =>
  c.targetType === "guide" ? `/guides/${c.targetSlug}` : `/wiki/${c.targetSlug}`;

function Pager({
  page,
  totalPages,
  loading,
  onGo,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onGo: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-end gap-2 pt-2 text-caption">
      <button
        type="button"
        disabled={page <= 1 || loading}
        onClick={() => onGo(page - 1)}
        className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
      >
        上一页
      </button>
      <span className="font-mono text-faint">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages || loading}
        onClick={() => onGo(page + 1)}
        className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
      >
        下一页
      </button>
    </nav>
  );
}

function ThreadList({ items }: { items: Thread[] }) {
  return (
    <ol className="divide-y divide-border-subtle">
      {items.map((t) => (
        <li key={t.id}>
          <Link
            href={`/forum/threads/${t.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-raised"
          >
            <span className="min-w-0 grow">
              <span className="block truncate text-small font-medium text-primary group-hover:text-amber">
                {t.title}
              </span>
              <span className="mt-0.5 block font-mono text-caption text-faint">
                回复 {t.replyCount} · 浏览 {t.viewCount} · {t.createdAt.slice(0, 10)}
              </span>
            </span>
            <span aria-hidden className="font-mono text-caption text-faint">→</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function PublicProfileTabs({
  userId,
  privacy,
}: {
  userId: string;
  privacy?: Privacy;
}) {
  const [tab, setTab] = useState<TabKey>("threads");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [bookmarks, setBookmarks] = useState<Thread[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(
    (t: TabKey, p: number) => {
      setLoading(true);
      setHidden(false);
      setErr("");
      request<ListResult<Thread | MyComment>>(`/users/${userId}/${t}`, {
        auth: false,
        query: { page: p, perPage: 10 },
      })
        .then((r) => {
          if (t === "threads") setThreads(r.data as Thread[]);
          else if (t === "comments") setComments(r.data as MyComment[]);
          else setBookmarks(r.data as Thread[]);
          setTotalPages(Math.max(1, r.pagination.totalPages));
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 403) setHidden(true);
          else setErr("内容加载失败，请稍后重试。");
        })
        .finally(() => setLoading(false));
    },
    [userId],
  );

  useEffect(() => {
    setPage(1);
    load(tab, 1);
  }, [tab, load]);

  const activePrivKey = TABS.find((t) => t.key === tab)!.privKey;
  const privacyOff = privacy && privacy[activePrivKey] === false;

  return (
    <section aria-label="主页内容分区">
      <div className="flex gap-2" role="tablist" aria-label="内容分区">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-5 py-2 text-small transition-colors duration-fast ${
              tab === t.key
                ? "bg-amber font-medium text-amber-fg"
                : "border border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-8 text-center text-small text-faint">载入中…</p>
        ) : hidden || privacyOff ? (
          <p className="p-8 text-center text-small text-faint">
            该用户未公开此栏目。
          </p>
        ) : err ? (
          <p role="alert" className="p-8 text-center text-small text-faint">{err}</p>
        ) : tab === "comments" ? (
          comments.length === 0 ? (
            <p className="p-8 text-center text-small text-faint">暂无评论。</p>
          ) : (
            <ol className="divide-y divide-border-subtle">
              {comments.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-small text-secondary">
                    {c.content}
                  </p>
                  <p className="mt-1.5 font-mono text-caption text-faint">
                    {c.createdAt.slice(0, 10)} · 评论于{" "}
                    <Link
                      href={commentTargetUrl(c)}
                      className="text-amber hover:underline"
                    >
                      {c.targetTitle}
                    </Link>{" "}
                    · 👍 {c.likeCount}
                  </p>
                </li>
              ))}
            </ol>
          )
        ) : (
          (() => {
            const items = tab === "threads" ? threads : bookmarks;
            return items.length === 0 ? (
              <p className="p-8 text-center text-small text-faint">
                {tab === "threads" ? "暂无主题。" : "暂无收藏。"}
              </p>
            ) : (
              <ThreadList items={items} />
            );
          })()
        )}
      </div>

      {!hidden && !privacyOff && !err && (
        <Pager
          page={page}
          totalPages={totalPages}
          loading={loading}
          onGo={(p) => {
            setPage(p);
            load(tab, p);
          }}
        />
      )}
    </section>
  );
}
