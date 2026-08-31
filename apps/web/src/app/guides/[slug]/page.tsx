import type { Metadata } from "next";
import Link from "next/link";
import { DetailSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return { title: `攻略 ${params.slug}` };
}

/** 攻略详情骨架：面包屑 + 正文 + 评分面板 + 评论区 */
export default function GuideDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="mx-auto max-w-page">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/guides" className="text-secondary transition-colors duration-fast hover:text-amber">
          GUIDES
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{params.slug}</span>
      </nav>

      <div className="mt-6 space-y-10">
        <article>
          <DetailSkeleton />
        </article>

        {/* 评分面板占位 */}
        <section
          aria-labelledby="rating-panel"
          className="max-w-reading rounded-md border border-border-subtle bg-surface p-6"
        >
          <h2 id="rating-panel" className="font-serif text-h2 font-semibold">
            评分
          </h2>
          <div className="mt-4 space-y-2" aria-hidden>
            <span className="block h-4 w-1/4 rounded-sm border border-dashed border-border-subtle" />
            {[5, 4, 3, 2, 1].map((star) => (
              <span key={star} className="flex items-center gap-3">
                <span className="w-6 text-right font-mono text-caption text-faint">{star}★</span>
                <span className="block h-3 flex-1 rounded-sm border border-dashed border-border-subtle" />
              </span>
            ))}
          </div>
          <p className="mt-4 text-caption text-faint">
            平均分、分布与「我的评分」将在契约确认 myScore 字段后启用。
          </p>
        </section>

        {/* 评论区占位 */}
        <section
          aria-labelledby="guide-comments"
          className="rounded-md border border-border-subtle bg-surface p-6"
        >
          <h2 id="guide-comments" className="font-serif text-h2 font-semibold">
            讨论
          </h2>
          <p className="mt-3 rounded-sm border border-dashed border-border-subtle px-4 py-6 text-center font-mono text-caption text-faint">
            评论区将在后端数据接入后启用
          </p>
        </section>
      </div>
    </div>
  );
}
