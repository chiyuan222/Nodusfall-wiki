import type { Metadata } from "next";
import { wikiApi } from "@/lib/api";
import { WikiEditor } from "@/components/wiki/wiki-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "新建 Wiki 条目" };

/** 新建 Wiki 条目（admin / editor）。分类列表服务端预取。 */
export default async function NewWikiPage() {
  const categories = await wikiApi.categories().catch(() => []);

  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Wiki Editor
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">新建 Wiki 条目</h1>
        <p className="mt-2 text-small text-secondary">
          保存为草稿可稍后继续编辑；发布后将在 Wiki 资料库公开展示。
        </p>
      </header>
      <WikiEditor mode="create" categories={categories} />
    </div>
  );
}
