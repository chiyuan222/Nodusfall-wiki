import type { Metadata } from "next";
import { ListSkeleton } from "@/components/skeleton";

export async function generateMetadata({
  params,
}: {
  params: { boardSlug: string };
}): Promise<Metadata> {
  return { title: `板块 ${params.boardSlug}` };
}

/** 板块主题列表骨架：排序切换（lastPostAt/createdAt）+ 分页 */
export default function BoardThreadsPage({
  params,
}: {
  params: { boardSlug: string };
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-h1 font-semibold">
            板块：{params.boardSlug}
          </h1>
          <p className="mt-2 text-small text-secondary">
            GET /v1/forum/boards/{params.boardSlug}/threads
          </p>
        </div>
      </header>
      <ListSkeleton count={6} />
    </div>
  );
}
