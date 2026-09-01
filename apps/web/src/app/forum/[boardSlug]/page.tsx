import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forumApi } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { EmptyState } from "@/components/empty-state";
import { FloatingWindows } from "@/components/forum/floating-windows";
import { authorName } from "@/lib/author";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { boardSlug: string };
}): Promise<Metadata> {
  try {
    const boards = await forumApi.boards();
    const board = boards.find((b) => b.slug === params.boardSlug);
    return { title: board ? `${board.name} · 论坛` : "板块" };
  } catch {
    return { title: "板块" };
  }
}

const SORTS = [
  { value: "lastPostAt", label: "最新回复" },
  { value: "createdAt", label: "最新发布" },
] as const;

export default async function BoardThreadsPage({
  params,
  searchParams,
}: {
  params: { boardSlug: string };
  searchParams: { sort?: string; page?: string };
}) {
  const sort = searchParams.sort === "createdAt" ? "createdAt" : "lastPostAt";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const boards = await forumApi.boards().catch(() => null);
  const board = boards?.find((b) => b.slug === params.boardSlug);
  if (boards && !board) notFound();

  const threads = board
    ? await forumApi
        .threads(params.boardSlug, { sort, page })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) notFound();
          // 后端暂未实现 sort 参数（400）时降级为默认排序，保证列表可用
          if (e instanceof ApiError && e.status === 400) {
            return forumApi.threads(params.boardSlug, { page }).catch(() => null);
          }
          return null;
        })
    : null;

  const sortHref = (s: string, p?: number) => {
    const q = new URLSearchParams();
    if (s !== "lastPostAt") q.set("sort", s);
    if (p && p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/forum/${params.boardSlug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-page space-y-8">
      <FloatingWindows />
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/forum" className="text-secondary transition-colors duration-fast hover:text-amber">
          FORUM
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{board?.name ?? params.boardSlug}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
            Board
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
            {board?.name ?? params.boardSlug}
          </h1>
          {board?.description && (
            <p className="mt-2 text-small text-secondary">{board.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 排序切换 */}
          <div className="flex gap-2" aria-label="排序方式">
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={sortHref(s.value)}
                aria-current={sort === s.value ? "true" : undefined}
                className={`rounded-md border px-4 py-1.5 text-small transition-colors duration-fast ${
                  sort === s.value
                    ? "border-amber bg-amber text-amber-fg"
                    : "border-border-subtle text-secondary hover:border-amber-soft hover:text-primary"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
          <Link
            href={`/forum/${params.boardSlug}/new`}
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            + 发布主题
          </Link>
        </div>
      </header>

      {/* 主题列表：图文卡片（有封面的主题右侧显示缩略图） */}
      {!threads ? (
        <EmptyState title="板块数据暂时不可用" description="请稍后重试。" />
      ) : threads.data.length === 0 ? (
        <EmptyState
          title="还没有主题"
          description="成为第一个发帖的人——点击右上角「发布主题」。"
        />
      ) : (
        <ol className="space-y-3">
          {threads.data.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/threads/${t.id}`}
                className="group flex items-stretch gap-4 rounded-md border border-border-subtle bg-surface p-4 transition-colors duration-fast hover:border-amber-soft"
              >
                <span className="min-w-0 flex-1">
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
                    <span className="truncate text-body font-semibold text-primary group-hover:text-amber">
                      {t.title}
                    </span>
                  </span>
                  {t.excerpt && (
                    <span className="mt-1.5 line-clamp-2 block text-small text-secondary">
                      {t.excerpt}
                    </span>
                  )}
                  <span className="mt-2 block font-mono text-caption text-faint">
                    {authorName(t.author)} · 回复 {t.replyCount} · 喜欢 {t.likeCount} · 浏览 {t.viewCount} ·{" "}
                    {t.lastPostAt.slice(0, 10)} 更新
                  </span>
                </span>
                {t.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- 用户上传封面，尺寸未知
                  <img
                    src={t.coverImage}
                    alt=""
                    className="hidden w-32 shrink-0 rounded-sm border border-border-subtle object-cover sm:block"
                  />
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {/* 分页 */}
      {threads && threads.pagination.totalPages > 1 && (
        <nav aria-label="分页" className="flex items-center justify-center gap-3 pt-2">
          {page > 1 && (
            <Link
              href={sortHref(sort, page - 1)}
              className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
            >
              ← 上一页
            </Link>
          )}
          <span className="font-mono text-caption text-faint">
            {threads.pagination.page} / {threads.pagination.totalPages}
          </span>
          {threads.pagination.hasMore && (
            <Link
              href={sortHref(sort, page + 1)}
              className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
            >
              下一页 →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
