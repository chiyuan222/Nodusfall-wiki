import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forumApi, type ForumThread } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { Markdown } from "@/components/markdown";
import { AdminThreadControls, BookmarkButton, PostSection } from "@/components/forum/thread-interactions";
import { HistoryReporter } from "@/components/history-reporter";
import { authorName } from "@/lib/author";

export const dynamic = "force-dynamic";

async function loadThread(threadId: string): Promise<ForumThread> {
  try {
    return await forumApi.thread(threadId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { threadId: string };
}): Promise<Metadata> {
  try {
    const t = await forumApi.thread(params.threadId);
    return { title: `${t.title} · 论坛`, description: t.excerpt };
  } catch {
    return { title: "主题 · 论坛" };
  }
}

export default async function ThreadPage({
  params,
}: {
  params: { threadId: string };
}) {
  const thread = await loadThread(params.threadId);
  const posts = await forumApi.posts(params.threadId).catch(() => ({
    data: [],
    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0, hasMore: false },
  }));

  return (
    <div className="mx-auto max-w-page space-y-10">
      <HistoryReporter kind="forumThread" slug={thread.id} />
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/forum" className="text-secondary transition-colors duration-fast hover:text-amber">
          FORUM
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/forum/${thread.boardSlug}`}
          className="text-secondary transition-colors duration-fast hover:text-amber"
        >
          {thread.boardSlug}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{thread.title}</span>
      </nav>

      {/* 主楼 */}
      <article className="space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {thread.pinned && (
              <span className="rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                置顶
              </span>
            )}
            {thread.locked && (
              <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
                锁定
              </span>
            )}
          </div>
          <h1 className="font-serif text-display font-semibold">{thread.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-faint">
            <span>{authorName(thread.author)}</span>
            <span aria-hidden>·</span>
            <time dateTime={thread.createdAt}>
              发布于 {new Date(thread.createdAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}
            </time>
            <span aria-hidden>·</span>
            <span>回复 {thread.replyCount} · 喜欢 {thread.likeCount}</span>
            <span className="grow" />
            <AdminThreadControls
              threadId={thread.id}
              initialPinned={thread.pinned}
              initialLocked={thread.locked}
            />
            <BookmarkButton
              threadId={thread.id}
              initialBookmarked={thread.bookmarkedByMe}
            />
          </div>
        </header>

        {thread.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element -- 用户上传封面，尺寸未知
          <img
            src={thread.coverImage}
            alt={thread.title}
            className="max-h-96 w-full rounded-md border border-border-subtle object-cover"
          />
        )}

        <Markdown content={thread.content} />
      </article>

      <PostSection
        threadId={thread.id}
        locked={thread.locked}
        initial={posts}
      />
    </div>
  );
}
