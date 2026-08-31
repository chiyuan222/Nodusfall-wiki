import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wikiApi, type WikiPage } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { WikiEditor, RevisionList } from "@/components/wiki/wiki-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "编辑 Wiki 条目" };

/** 编辑已有 Wiki 条目（admin / editor）。条目与分类服务端预取。 */
export default async function EditWikiPage({
  params,
}: {
  params: { slug: string };
}) {
  let page: WikiPage;
  try {
    page = await wikiApi.page(params.slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const categories = await wikiApi.categories().catch(() => []);

  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Wiki Editor
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">
          编辑：{page.title}
        </h1>
        <p className="mt-2 font-mono text-caption text-faint">
          v{page.version} · {page.revisionCount} 次修订
        </p>
      </header>
      <WikiEditor mode="edit" initial={page} categories={categories} />
      <RevisionList slug={page.slug} />
    </div>
  );
}
