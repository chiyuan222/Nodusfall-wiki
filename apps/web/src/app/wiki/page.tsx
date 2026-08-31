import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Wiki 资料库",
  description: "《源初之结》Wiki：分类浏览、标签筛选与条目搜索。",
};

export default function WikiIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-h1 font-semibold">Wiki 资料库</h1>
        <p className="mt-2 text-small text-secondary">
          由玩家共同维护的游戏资料。分类导航与条目列表来自{" "}
          <code className="rounded-sm bg-raised px-1 font-mono text-caption text-amber">
            GET /v1/wiki/categories · GET /v1/wiki/pages
          </code>
        </p>
      </header>
      <EmptyState
        title="分类编目进行中"
        description="分类导航、标签筛选与分页将在后端接口就绪后启用。"
        action={{ href: "/search", label: "先去搜索" }}
      />
    </div>
  );
}
