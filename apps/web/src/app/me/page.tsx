import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "用户中心" };

export default function MePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h1 font-semibold">用户中心</h1>
      <EmptyState
        title="需要登录"
        description="我的攻略、帖子与收藏将在契约补充对应端点后开放（提案 §6.2）。"
        action={{ href: "/login", label: "去登录" }}
      />
    </div>
  );
}
