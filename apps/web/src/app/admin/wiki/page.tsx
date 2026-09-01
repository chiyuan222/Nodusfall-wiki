import type { Metadata } from "next";
import { AdminContentList } from "@/components/admin/admin-content-list";

export const metadata: Metadata = {
  title: "Wiki 内容管理",
  robots: { index: false },
};

export default function AdminWikiPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Wiki
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">Wiki 内容管理</h1>
        <p className="mt-2 text-small text-secondary">
          查看全部条目（含草稿与归档），可直接发布、归档或进入编辑器。
        </p>
      </header>
      <AdminContentList kind="wiki" />
    </div>
  );
}
