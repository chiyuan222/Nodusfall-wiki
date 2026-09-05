import type { Metadata } from "next";
import { BoardsOverview } from "@/components/admin/boards-overview";

export const metadata: Metadata = {
  title: "板块管理",
  description: "聚合管理全站板块结构：Wiki 分类、攻略内容、论坛板块、视频分区。",
  robots: { index: false },
};

export default function AdminBoardsPage() {
  return (
    <div className="mx-auto max-w-page py-8">
      <header className="mb-6">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Boards
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">板块管理</h1>
        <p className="mt-2 text-small text-secondary">
          全站板块结构与内容总览（仅管理员/站长）；分区小编与版主请在对应分区页内管理本区内容。
        </p>
      </header>
      <BoardsOverview />
    </div>
  );
}
