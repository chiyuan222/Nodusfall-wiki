import type { Metadata } from "next";
import { DetailSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return { title: `条目 ${params.slug}` };
}

/** Wiki 详情骨架：正文 + 粘性目录 + 评论区三段式，契约冻结后接数据 */
export default function WikiPageDetail({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <article>
        <p className="text-caption text-faint">条目：{params.slug}</p>
        <DetailSkeleton />
      </article>
      <aside
        aria-label="目录"
        className="hidden lg:sticky lg:top-20 lg:block lg:self-start"
      >
        <div className="rounded-md border border-border-subtle bg-surface p-4">
          <h2 className="text-small font-semibold text-secondary">目录</h2>
          <p className="mt-2 text-caption text-faint">
            目录由正文 heading 自动生成（MarkdownRenderer）。
          </p>
        </div>
      </aside>
    </div>
  );
}
