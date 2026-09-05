import type { Metadata } from "next";
import { WikiBoardAdmin } from "@/components/admin/wiki-board-admin";

export const metadata: Metadata = {
  title: "Wiki 板块管理",
  robots: { index: false },
};

export default function AdminWikiPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Wiki
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">Wiki 板块管理</h1>
        <p className="mt-2 text-small text-secondary">
          词条内容（草稿/发布/下架/删除/精华）、分类结构与分区内举报处理。
        </p>
      </header>
      <WikiBoardAdmin />
    </div>
  );
}
