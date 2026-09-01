"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { commentApi, type Comment } from "@/lib/api";
import { request, type ListResult, type Pagination } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { authorName } from "@/lib/author";
import { useMe, canPost, isAdminRole } from "@/lib/me";
import { UserGroupBadge, UserStatusMark, SiteIdMark } from "@/components/user-marks";

/**
 * 评论区（Wiki 条目 / 攻略共用，客户端组件）。
 * 数据：GET /<target>/<slug>/comments（分页）；发表/点赞/删除需登录。
 * 首屏数据由服务端注入，后续分页与变更走客户端请求。
 * 契约 PR #51：normal 组 / muted / banned 仅浏览不显示发表框；作者位展示用户组与受限标识。
 */

export function CommentSection({
  targetType,
  slug,
  initial,
  title = "评论",
}: {
  targetType: "wiki" | "guide";
  slug: string;
  initial: ListResult<Comment>;
  title?: string;
}) {
  const [items, setItems] = useState<Comment[]>(initial.data);
  const [pagination, setPagination] = useState<Pagination>(initial.pagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");
  const { me, pending } = useMe();
  const loggedIn = !pending && !!me;

  const listPath =
    targetType === "wiki"
      ? `/wiki/pages/${slug}/comments`
      : `/guides/${slug}/comments`;

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination.hasMore) return;
    setLoadingMore(true);
    request<ListResult<Comment>>(listPath, {
      query: { page: pagination.page + 1 },
      auth: false,
    })
      .then((r) => {
        setItems((prev) => [...prev, ...r.data]);
        setPagination(r.pagination);
      })
      .catch(() => setMsg("加载更多失败，请稍后重试。"))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, pagination, listPath]);

  const post = () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setMsg("");
    commentApi
      .create(targetType, slug, content)
      .then((created) => {
        setItems((prev) => [created, ...prev]);
        setDraft("");
        setPagination((p) => ({ ...p, total: p.total + 1 }));
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setMsg("登录已失效，请重新登录后再评论。");
        } else if (e instanceof ApiError && e.status === 429) {
          setMsg(`操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`);
        } else {
          setMsg("发表失败，请稍后重试。");
        }
      })
      .finally(() => setPosting(false));
  };

  const toggleLike = (c: Comment) => {
    if (!getAccessToken()) {
      setMsg("请先登录后再点赞。");
      return;
    }
    const call = c.likedByMe ? commentApi.unlike : commentApi.like;
    // 乐观更新
    setItems((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              likeCount: x.likeCount + (x.likedByMe ? -1 : 1),
            }
          : x,
      ),
    );
    call(c.id).catch(() => {
      // 失败回滚
      setItems((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      setMsg("操作失败，请稍后重试。");
    });
  };

  const remove = (c: Comment) => {
    commentApi
      .remove(c.id)
      .then(() => {
        setItems((prev) => prev.filter((x) => x.id !== c.id));
        setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      })
      .catch(() => setMsg("删除失败，请稍后重试。"));
  };

  const canManage = (c: Comment) =>
    me && (me.id === c.author.id || isAdminRole(me.role));

  return (
    <section
      aria-labelledby="comments-heading"
      className="rounded-md border border-border-subtle bg-surface p-6"
    >
      <h2 id="comments-heading" className="font-serif text-h2 font-semibold">
        {title}
        <span className="ml-2 font-mono text-caption font-normal text-faint">
          {pagination.total}
        </span>
      </h2>

      {/* 发表区：登录且用户组可发言；normal 组 / 禁言 / 封禁 仅浏览（契约 PR #51） */}
      {loggedIn && canPost(me) && (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="写下你的补充、纠错或心得…"
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={post}
              disabled={posting || !draft.trim()}
              className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
            >
              {posting ? "发表中…" : "发表评论"}
            </button>
            {msg && <span className="text-caption text-secondary">{msg}</span>}
          </div>
        </div>
      )}
      {loggedIn && !canPost(me) && (
        <p className="mt-4 rounded-sm border border-dashed border-border-subtle px-4 py-3 text-small text-secondary">
          {me?.status === "muted"
            ? "账号处于禁言状态，暂不可发表评论。"
            : me?.status === "banned"
              ? "账号已被封禁，仅可浏览。"
              : "当前用户组仅支持浏览，暂不可发表评论。"}
        </p>
      )}
      {!loggedIn && !pending && (
        <p className="mt-4 rounded-sm border border-dashed border-border-subtle px-4 py-3 text-small text-secondary">
          <Link href="/login" className="text-amber hover:underline">
            登录
          </Link>{" "}
          后即可发表评论与点赞。
          {msg && <span className="ml-2 text-caption">{msg}</span>}
        </p>
      )}
      {loggedIn && msg && !draft && (
        <p className="mt-2 text-caption text-secondary">{msg}</p>
      )}

      {/* 列表 */}
      {items.length === 0 ? (
        <p className="mt-6 rounded-sm border border-dashed border-border-subtle px-4 py-6 text-center font-mono text-caption text-faint">
          还没有评论，来写下第一条。
        </p>
      ) : (
        <ol className="mt-6 divide-y divide-border-subtle">
          {items.map((c) => (
            <li key={c.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-small font-medium text-primary">
                  {authorName(c.author)}
                </span>
                <UserGroupBadge group={c.author.group} level={c.author.level} />
                <SiteIdMark siteId={c.author.siteId} />
                <UserStatusMark status={c.author.status} />
                <time
                  dateTime={c.createdAt}
                  className="font-mono text-caption text-faint"
                >
                  {new Date(c.createdAt).toLocaleString("zh-CN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                <span className="grow" />
                <button
                  type="button"
                  onClick={() => toggleLike(c)}
                  aria-pressed={c.likedByMe}
                  className={`rounded-sm border px-2 py-0.5 text-caption transition-colors duration-fast ${
                    c.likedByMe
                      ? "border-amber-soft text-amber"
                      : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
                  }`}
                >
                  👍 {c.likeCount}
                </button>
                {canManage(c) && (
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-danger hover:border-danger"
                  >
                    删除
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-body text-primary">
                {c.content}
              </p>
            </li>
          ))}
        </ol>
      )}

      {pagination.hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 w-full rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary disabled:opacity-40"
        >
          {loadingMore ? "加载中…" : `加载更多（${pagination.page}/${pagination.totalPages} 页）`}
        </button>
      )}
    </section>
  );
}
