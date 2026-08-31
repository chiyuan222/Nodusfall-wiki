import type { Metadata } from "next";
import Link from "next/link";
import { searchApi, type SearchResult } from "@/lib/api";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "搜索" };

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  wiki: "Wiki",
  guide: "攻略",
  forum: "论坛",
};

const KIND_FILTERS = [
  { value: "all", label: "全部" },
  { value: "wiki", label: "Wiki" },
  { value: "guide", label: "攻略" },
  { value: "forum", label: "论坛" },
] as const;

/**
 * 后端返回的 url 是服务端视角路径（如 /wiki/pages/:slug），
 * 前端路由为 /wiki/:slug——在此归一化；后端对齐后此映射可删。
 */
function resolveHref(r: SearchResult): string {
  if (r.kind === "wiki") return r.url.replace(/^\/wiki\/pages\//, "/wiki/");
  return r.url;
}

/** 全局搜索：GET /v1/search?q=&kind=&page= */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; kind?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const kind = (["all", "wiki", "guide", "forum"] as const).includes(
    searchParams.kind as never,
  )
    ? (searchParams.kind as "all" | "wiki" | "guide" | "forum")
    : "all";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const result = q
    ? await searchApi.search(q, kind, page).catch(() => null)
    : null;

  const filterHref = (k: string, p?: number) => {
    const params = new URLSearchParams({ q });
    if (k !== "all") params.set("kind", k);
    if (p && p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-page space-y-8">
      <header className="pt-6 lg:pt-10">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Search
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
          搜索
        </h1>
        <p className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          统一检索 Wiki 条目、攻略与论坛主题。
        </p>
      </header>

      <form action="/search" method="get" role="search" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜索 Wiki、攻略、论坛…"
          aria-label="搜索关键词"
          className="w-full max-w-reading rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary placeholder:text-faint"
        />
        {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
        <button
          type="submit"
          className="rounded-md bg-amber px-5 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          搜索
        </button>
      </form>

      {q && (
        <nav aria-label="结果类型筛选" className="flex gap-2">
          {KIND_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              aria-current={kind === f.value ? "true" : undefined}
              className={`rounded-md border px-3 py-1.5 text-small transition-colors duration-fast ${
                kind === f.value
                  ? "border-amber bg-amber text-amber-fg"
                  : "border-border-subtle text-secondary hover:border-amber-soft hover:text-primary"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}

      {!q && <EmptyState title="输入关键词开始搜索" />}

      {q && result === null && (
        <EmptyState
          title="搜索服务暂时不可用"
          description="请稍后重试。"
        />
      )}

      {q && result && result.data.length === 0 && (
        <EmptyState
          title={`没有找到「${q}」相关内容`}
          description="换个关键词试试，或到 Wiki 与攻略区浏览已有内容。"
        />
      )}

      {result && result.data.length > 0 && (
        <>
          <p className="text-caption text-faint" role="status">
            共 {result.pagination.total} 条结果
          </p>
          <ol className="space-y-3">
            {result.data.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <Link
                  href={resolveHref(r)}
                  className="block rounded-md border border-border-subtle bg-surface p-4 transition-colors duration-fast hover:border-amber-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-sm border border-amber-soft px-2 py-0.5 font-mono text-caption text-amber">
                      {KIND_LABEL[r.kind]}
                    </span>
                    <h2 className="text-body font-semibold text-primary">
                      {r.title}
                    </h2>
                    {r.updatedAt && (
                      <time
                        dateTime={r.updatedAt}
                        className="ml-auto font-mono text-caption text-faint"
                      >
                        {new Date(r.updatedAt).toLocaleDateString("zh-CN")}
                      </time>
                    )}
                  </div>
                  {r.excerpt && (
                    <p className="mt-2 line-clamp-2 text-small text-secondary">
                      {r.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ol>

          {result.pagination.totalPages > 1 && (
            <nav
              aria-label="搜索结果分页"
              className="flex items-center justify-center gap-3 pt-2"
            >
              {page > 1 && (
                <Link
                  href={filterHref(kind, page - 1)}
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
                >
                  ← 上一页
                </Link>
              )}
              <span className="font-mono text-caption text-faint">
                {result.pagination.page} / {result.pagination.totalPages}
              </span>
              {result.pagination.hasMore && (
                <Link
                  href={filterHref(kind, page + 1)}
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
                >
                  下一页 →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
