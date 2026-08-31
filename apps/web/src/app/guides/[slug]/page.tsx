import type { Metadata } from "next";
import { DetailSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return { title: `攻略 ${params.slug}` };
}

/** 攻略详情骨架：正文 + 评分面板 + 评论区 */
export default function GuideDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="space-y-8">
      <article>
        <p className="text-caption text-faint">攻略：{params.slug}</p>
        <DetailSkeleton />
      </article>
      <section
        aria-labelledby="rating-panel"
        className="max-w-reading rounded-md border border-border-subtle bg-surface p-6"
      >
        <h2 id="rating-panel" className="font-serif text-h2 font-medium">
          评分
        </h2>
        <p className="mt-2 text-small text-faint">
          平均分、分布条形与我的评分（RatingSummary）将在契约确认 myScore 后启用。
        </p>
      </section>
    </div>
  );
}
