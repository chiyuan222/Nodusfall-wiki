"use client";

import { useState } from "react";
import { AdminContentList } from "@/components/admin/admin-content-list";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

/**
 * Wiki 分区板块管理（/admin/wiki）：词条内容 + 分类结构 两个子页签。
 * 门禁在子组件内（manage_wiki_board / manage_all_boards / admin / owner）。
 */
export function WikiBoardAdmin() {
  const [tab, setTab] = useState<"content" | "taxonomy">("content");
  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="Wiki 板块管理">
        {(
          [
            ["content", "词条内容"],
            ["taxonomy", "分类结构"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-md px-5 py-2 text-small transition-colors duration-fast ${
              tab === k
                ? "bg-amber font-medium text-amber-fg"
                : "border border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "content" ? (
        <AdminContentList kind="wiki" />
      ) : (
        <TaxonomyManager fixedKind="wiki" hideTabs />
      )}
    </div>
  );
}
