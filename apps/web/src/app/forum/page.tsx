import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "论坛",
  description: "《源初之结》玩家论坛：板块讨论、主题与回复。",
};

export default function ForumIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-h1 font-semibold">论坛</h1>
        <p className="mt-2 text-small text-secondary">
          板块列表来自 GET /v1/forum/boards。
        </p>
      </header>
      <EmptyState
        title="板块集结中"
        description="板块列表与主题流将在后端接口就绪后启用。"
      />
    </div>
  );
}
