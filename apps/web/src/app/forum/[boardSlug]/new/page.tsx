import type { Metadata } from "next";
import Link from "next/link";
import { forumApi } from "@/lib/api";
import { NewThreadForm } from "@/components/forum/new-thread-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "发布主题 · 论坛" };

export default async function NewThreadPage({
  params,
}: {
  params: { boardSlug: string };
}) {
  const boards = await forumApi.boards().catch(() => null);
  const board = boards?.find((b) => b.slug === params.boardSlug);

  return (
    <div className="mx-auto max-w-page space-y-8">
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/forum" className="text-secondary transition-colors duration-fast hover:text-amber">
          FORUM
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/forum/${params.boardSlug}`}
          className="text-secondary transition-colors duration-fast hover:text-amber"
        >
          {board?.name ?? params.boardSlug}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-faint">发布主题</span>
      </nav>

      <header>
        <h1 className="font-serif text-[2rem] font-semibold text-primary">
          发布主题
        </h1>
        <p className="mt-2 text-small text-secondary">
          发布到板块「{board?.name ?? params.boardSlug}」。请遵守社区规范，标题尽量说清主题。
        </p>
      </header>

      <NewThreadForm boardSlug={params.boardSlug} />
    </div>
  );
}
