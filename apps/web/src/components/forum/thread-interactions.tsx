"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forumApi, type ForumPost } from "@/lib/api";
import { request, type ListResult, type Pagination } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { Markdown } from "@/components/markdown";

interface Me {
  id: string;
  role?: string;
}

function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    if (!getAccessToken()) return;
    setLoggedIn(true);
    request<{ data: Me }>("/users/me")
      .then((r) => setMe(r.data))
      .catch(() => setMe(null));
  }, []);
  return { me, loggedIn };
}

function describeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 429) return `操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`;
    return e.problem.detail ?? e.problem.title;
  }
  return fallback;
}

/**
 * 管理员帖子操作（客户端）：置顶 / 锁定切换。
 * 仅 admin 渲染；PATCH /forum/threads/:id（pinned/locked 仅管理员可改，契约 §论坛）。
 */
export function AdminThreadControls({
  threadId,
  initialPinned,
  initialLocked,
}: {
  threadId: string;
  initialPinned: boolean;
  initialLocked: boolean;
}) {
  const router = useRouter();
  const { me } = useMe();
  const [pinned, setPinned] = useState(initialPinned);
  const [locked, setLocked] = useState(initialLocked);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (me?.role?.toLowerCase() !== "admin") return null;

  const toggle = (field: "pinned" | "locked", next: boolean) => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    forumApi
      .updateThread(threadId, { [field]: next })
      .then(() => {
        if (field === "pinned") setPinned(next);
        else setLocked(next);
        router.refresh();
      })
      .catch((e: unknown) => setMsg(describeError(e, "操作失败，请稍后重试。")))
      .finally(() => setBusy(false));
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        aria-pressed={pinned}
        onClick={() => toggle("pinned", !pinned)}
        className={`rounded-md border px-3 py-1.5 text-small transition-colors duration-fast disabled:opacity-40 ${
          pinned
            ? "border-amber bg-amber text-amber-fg"
            : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
        }`}
      >
        {pinned ? "取消置顶" : "置顶"}
      </button>
      <button
        type="button"
        disabled={busy}
        aria-pressed={locked}
        onClick={() => toggle("locked", !locked)}
        className={`rounded-md border px-3 py-1.5 text-small transition-colors duration-fast disabled:opacity-40 ${
          locked
            ? "border-danger text-danger"
            : "border-border-subtle text-secondary hover:border-danger hover:text-danger"
        }`}
      >
        {locked ? "解锁" : "锁定"}
      </button>
      {msg && <span className="text-caption text-secondary">{msg}</span>}
    </span>
  );
}

/** 收藏按钮（客户端）：PUT/DELETE /forum/threads/:id/bookmark */
export function BookmarkButton({  threadId,
  initialBookmarked,
}: {
  threadId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const { loggedIn } = useMe();
  const [msg, setMsg] = useState("");

  const toggle = () => {
    if (!loggedIn) {
      setMsg("登录后可收藏。");
      return;
    }
    if (busy) return;
    setBusy(true);
    setMsg("");
    const call = bookmarked ? forumApi.unbookmark : forumApi.bookmark;
    setBookmarked(!bookmarked); // 乐观更新
    call(threadId)
      .catch((e: unknown) => {
        setBookmarked(bookmarked); // 回滚
        setMsg(describeError(e, "操作失败，请稍后重试。"));
      })
      .finally(() => setBusy(false));
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={bookmarked}
        className={`rounded-md border px-4 py-1.5 text-small transition-colors duration-fast disabled:opacity-40 ${
          bookmarked
            ? "border-amber bg-amber text-amber-fg"
            : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
        }`}
      >
        {bookmarked ? "★ 已收藏" : "☆ 收藏"}
      </button>
      {msg && <span className="text-caption text-secondary">{msg}</span>}
    </span>
  );
}

/**
 * 回复区（客户端）：楼层列表 + 点赞 + 删除 + 回复框 + 分页。
 * 首屏数据由服务端注入。
 */
export function PostSection({
  threadId,
  locked,
  initial,
}: {
  threadId: string;
  locked: boolean;
  initial: ListResult<ForumPost>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ForumPost[]>(initial.data);
  const [pagination, setPagination] = useState<Pagination>(initial.pagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");
  const { me, loggedIn } = useMe();

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination.hasMore) return;
    setLoadingMore(true);
    request<ListResult<ForumPost>>(`/forum/threads/${threadId}/posts`, {
      query: { page: pagination.page + 1 },
      auth: false,
    })
      .then((r) => {
        setItems((prev) => [...prev, ...r.data]);
        setPagination(r.pagination);
      })
      .catch(() => setMsg("加载更多失败，请稍后重试。"))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, pagination, threadId]);

  const reply = () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setMsg("");
    forumApi
      .createPost(threadId, content)
      .then(() => {
        setDraft("");
        router.refresh(); // 新回复的楼层号由服务端分配，整体刷新最稳
      })
      .catch((e: unknown) =>
        setMsg(describeError(e, "发表失败，请稍后重试。")),
      )
      .finally(() => setPosting(false));
  };

  const toggleLike = (p: ForumPost) => {
    if (!loggedIn) {
      setMsg("请先登录后再点赞。");
      return;
    }
    const call = p.likedByMe ? forumApi.unlikePost : forumApi.likePost;
    setItems((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              likeCount: x.likeCount + (x.likedByMe ? -1 : 1),
            }
          : x,
      ),
    );
    call(p.id).catch(() => {
      setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      setMsg("操作失败，请稍后重试。");
    });
  };

  const remove = (p: ForumPost) => {
    forumApi
      .deletePost(p.id)
      .then(() => {
        setItems((prev) => prev.filter((x) => x.id !== p.id));
        setPagination((pg) => ({ ...pg, total: Math.max(0, pg.total - 1) }));
      })
      .catch((e: unknown) => setMsg(describeError(e, "删除失败。")));
  };

  const canManage = (p: ForumPost) =>
    me && (me.id === p.author.id || me.role?.toLowerCase() === "admin");

  return (
    <section aria-labelledby="posts-heading" className="space-y-6">
      <h2 id="posts-heading" className="font-serif text-h2 font-semibold">
        回复
        <span className="ml-2 font-mono text-caption font-normal text-faint">
          {pagination.total}
        </span>
      </h2>

      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border-subtle px-4 py-6 text-center font-mono text-caption text-faint">
          还没有回复，来抢沙发。
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-md border border-border-subtle bg-surface p-5"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-caption text-amber">
                  #{p.floor}
                </span>
                <span className="text-small font-medium text-primary">
                  {p.author.displayName}
                </span>
                <time
                  dateTime={p.createdAt}
                  className="font-mono text-caption text-faint"
                >
                  {new Date(p.createdAt).toLocaleString("zh-CN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                <span className="grow" />
                <button
                  type="button"
                  onClick={() => toggleLike(p)}
                  aria-pressed={p.likedByMe}
                  className={`rounded-sm border px-2 py-0.5 text-caption transition-colors duration-fast ${
                    p.likedByMe
                      ? "border-amber-soft text-amber"
                      : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
                  }`}
                >
                  👍 {p.likeCount}
                </button>
                {canManage(p) && (
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-danger hover:border-danger"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="mt-3">
                <Markdown content={p.content} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {pagination.hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary disabled:opacity-40"
        >
          {loadingMore ? "加载中…" : `加载更多（${pagination.page}/${pagination.totalPages} 页）`}
        </button>
      )}

      {/* 回复框 */}
      {locked ? (
        <p className="rounded-sm border border-dashed border-border-subtle px-4 py-3 text-center text-small text-faint">
          主题已锁定，无法回复。
        </p>
      ) : loggedIn ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="写下你的回复（支持 Markdown）…"
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={reply}
              disabled={posting || !draft.trim()}
              className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
            >
              {posting ? "发表中…" : "发表回复"}
            </button>
            {msg && <span className="text-caption text-danger">{msg}</span>}
          </div>
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-border-subtle px-4 py-3 text-small text-secondary">
          <Link href="/login" className="text-amber hover:underline">
            登录
          </Link>{" "}
          后即可回复与点赞。
          {msg && <span className="ml-2 text-caption">{msg}</span>}
        </p>
      )}
    </section>
  );
}
