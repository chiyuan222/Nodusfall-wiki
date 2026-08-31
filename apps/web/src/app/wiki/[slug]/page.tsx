import type { Metadata } from "next";
import Link from "next/link";
import { DetailSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return { title: `条目 ${params.slug}` };
}

/** Wiki 详情骨架：面包屑 + 正文 + 粘性目录 + 评论区，契约冻结后接数据 */
export default function WikiPageDetail({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="mx-auto max-w-page">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/wiki" className="text-secondary transition-colors duration-fast hover:text-amber">
          WIKI
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{params.slug}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_240px]">
        <article className="space-y-10">
          <DetailSkeleton />

          {/* 评论区占位 */}
          <section
            aria-labelledby="wiki-comments"
            className="rounded-md border border-border-subtle bg-surface p-6"
          >
            <h2 id="wiki-comments" className="font-serif text-h2 font-semibold">
              评论
            </h2>
            <p className="mt-3 rounded-sm border border-dashed border-border-subtle px-4 py-6 text-center font-mono text-caption text-faint">
              评论区将在后端数据接入后启用
            </p>
          </section>
        </article>

        {/* 粘性目录 */}
        <aside
          aria-label="目录"
          className="hidden lg:sticky lg:top-20 lg:block lg:self-start"
        >
          <div className="rounded-md border border-border-subtle bg-surface p-4">
            <p className="font-mono text-caption uppercase tracking-[0.3em] text-faint">
              Contents
            </p>
            <h2 className="mt-1 text-small font-semibold text-secondary">目录</h2>
            <div className="mt-3 space-y-2" aria-hidden>
              <span className="block h-3 w-4/5 rounded-sm border border-dashed border-border-subtle" />
              <span className="block h-3 w-3/5 rounded-sm border border-dashed border-border-subtle" />
              <span className="block h-3 w-2/3 rounded-sm border border-dashed border-border-subtle" />
            </div>
            <p className="mt-3 text-caption text-faint">
              目录由正文标题自动生成。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
