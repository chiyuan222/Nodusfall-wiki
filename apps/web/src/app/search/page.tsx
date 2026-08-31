import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "搜索" };

/** 全局搜索骨架：GET /v1/search?q=&kind= */
export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; kind?: string };
}) {
  const q = searchParams.q ?? "";
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
        <button
          type="submit"
          className="rounded-md bg-amber px-5 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          搜索
        </button>
      </form>
      {q ? (
        <EmptyState
          title={`「${q}」的搜索结果`}
          description="结果合并规则（wiki / guide / forum）将在契约冻结后接入 GET /v1/search。"
        />
      ) : (
        <EmptyState title="输入关键词开始搜索" />
      )}
    </div>
  );
}
