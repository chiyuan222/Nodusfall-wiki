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
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-h1 font-semibold">搜索</h1>
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
