import type { Metadata } from "next";
import { GuideBoardAdmin } from "@/components/admin/guide-board-admin";

export const metadata: Metadata = {
  title: "攻略内容管理",
  robots: { index: false },
};

export default function AdminGuidesPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Guides
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">攻略内容管理</h1>
        <p className="mt-2 text-small text-secondary">
          攻略内容管理与分区内举报处理：内容含草稿与归档，可直接发布、下架或进入编辑器。
        </p>
      </header>
      <GuideBoardAdmin />
    </div>
  );
}
