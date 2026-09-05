"use client";

import { useState } from "react";
import { AdminContentList } from "@/components/admin/admin-content-list";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { ReportQueue } from "@/components/admin/report-queue";

/**
 * 攻略分区板块管理（/admin/guides）：攻略内容 + 分类结构 + 举报处理 三个子页签。
 * 分类结构走 /admin/guides/categories（契约 PR #132）；
 * 举报页签锁定 targetType=guide；评论类举报仍在全站 /admin/reports 处理。
 * 门禁在子组件内（manage_guide_board / manage_all_boards / manage_reports / admin / owner）。
 */
export function GuideBoardAdmin() {
  const [tab, setTab] = useState<"content" | "taxonomy" | "reports">("content");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="攻略板块管理">
        {(
          [
            ["content", "攻略内容"],
            ["taxonomy", "分类结构"],
            ["reports", "举报处理"],
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
        <AdminContentList kind="guide" />
      ) : tab === "taxonomy" ? (
        <TaxonomyManager fixedKind="guide" hideTabs />
      ) : (
        <ReportQueue fixedTargetType="guide" />
      )}
    </div>
  );
}
