import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "攻略",
  description: "《源初之结》玩家攻略：配队、养成与评分。",
};

export default function GuidesIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-h1 font-semibold">攻略</h1>
        <p className="mt-2 text-small text-secondary">
          玩家产出的攻略与心得，支持标签筛选与评分排序（GET /v1/guides）。
        </p>
      </header>
      <EmptyState
        title="等待第一篇攻略"
        description="攻略列表、筛选与评分面板将在后端接口就绪后启用。"
        action={{ href: "/editor/guide/new", label: "撰写攻略" }}
      />
    </div>
  );
}
