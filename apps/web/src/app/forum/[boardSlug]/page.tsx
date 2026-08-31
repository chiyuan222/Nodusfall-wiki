import type { Metadata } from "next";
import Link from "next/link";
import { ListSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { boardSlug: string };
}): Promise<Metadata> {
  return { title: `板块 ${params.boardSlug}` };
}

/** 板块主题列表骨架：面包屑 + 排序切换 + 列表 + 分页，契约冻结后接数据 */
export default function BoardThreadsPage({
  params,
}: {
  params: { boardSlug: string };
}) {
  return (
    <div className="mx-auto max-w-page space-y-8">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/forum" className="text-secondary transition-colors duration-fast hover:text-amber">
          FORUM
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{params.boardSlug}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
            Board
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
            {params.boardSlug}
          </h1>
        </div>
        {/* 排序切换（禁用态，契约冻结后启用） */}
        <div className="flex gap-2" aria-label="排序方式">
          {["最新回复", "最新发布"].map((label, i) => (
            <button
              key={label}
              type="button"
              disabled
              aria-disabled
              title="将在后端数据接入后启用"
              className={`rounded-md border px-4 py-1.5 text-small ${
                i === 0
                  ? "border-amber-soft/60 text-amber"
                  : "border-border-subtle text-faint"
              } opacity-60`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <ListSkeleton count={6} />

      {/* 分页占位 */}
      <nav aria-label="分页" className="flex items-center justify-center gap-4 pt-2">
        {["上一页", "下一页"].map((label) => (
          <button
            key={label}
            type="button"
            disabled
            aria-disabled
            className="rounded-md border border-border-subtle px-4 py-1.5 text-small text-faint opacity-60"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
