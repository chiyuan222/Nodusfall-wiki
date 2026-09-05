"use client";

import { useState } from "react";
import { useMe, hasPermission } from "@/lib/me";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { AdminContentList } from "@/components/admin/admin-content-list";
import { VideoManager } from "@/components/admin/video-manager";

/**
 * 总板块管理（/admin/boards，权限体系 v2 第二波）。
 * 聚合全站结构：Wiki 分类 / 攻略内容 / 论坛板块 / 视频分区。
 * 仅 manage_all_boards 可见（admin/owner 恒通过）。
 */

type Tab = "wiki" | "guide" | "forum" | "video";

const TABS: { key: Tab; label: string }[] = [
  { key: "wiki", label: "Wiki 分类" },
  { key: "guide", label: "攻略内容" },
  { key: "forum", label: "论坛板块" },
  { key: "video", label: "视频分区" },
];

export function BoardsOverview() {
  const { me, pending } = useMe();
  const [tab, setTab] = useState<Tab>("wiki");

  if (pending) {
    return <p className="py-16 text-center text-small text-faint">正在校验权限…</p>;
  }

  if (!me || !hasPermission(me, "manage_all_boards")) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-h1 font-semibold">无访问权限</h1>
        <p className="mt-3 text-small text-secondary">
          总板块管理仅管理员与站长可用（manage_all_boards）；分区版主请在对应分区页内管理。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="板块分组">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-5 py-2 text-small transition-colors duration-fast ${
              tab === t.key
                ? "bg-amber font-medium text-amber-fg"
                : "border border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "wiki" && (
        <section aria-label="Wiki 分类结构">
          <TaxonomyManager fixedKind="wiki" hideTabs />
        </section>
      )}
      {tab === "guide" && (
        <section aria-label="攻略内容">
          <AdminContentList kind="guide" />
        </section>
      )}
      {tab === "forum" && (
        <section aria-label="论坛板块结构">
          <TaxonomyManager fixedKind="forum" hideTabs />
        </section>
      )}
      {tab === "video" && (
        <section aria-label="视频分区管理">
          <VideoManager />
        </section>
      )}
    </div>
  );
}
