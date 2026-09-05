"use client";

import { useState } from "react";
import { useMe, hasPermission } from "@/lib/me";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { AdminContentList } from "@/components/admin/admin-content-list";
import { VideoManager } from "@/components/admin/video-manager";
import { ForumThreadAdmin } from "@/components/admin/forum-thread-admin";

/**
 * 总板块管理（/admin/boards，权限体系 v2 第二波 + 批次补齐）。
 * 四个分区 Tab 均为「结构 + 内容」双管理：
 * - Wiki：分类结构 + 词条内容
 * - 攻略：分类结构 + 攻略内容
 * - 论坛：板块结构 + 主题内容（置顶/锁定/删除/处置作者）
 * - 视频：分区 + 条目
 * 仅 manage_all_boards 可见（admin/owner 恒通过）。
 */

type Tab = "wiki" | "guide" | "forum" | "video";

const TABS: { key: Tab; label: string }[] = [
  { key: "wiki", label: "Wiki 分区" },
  { key: "guide", label: "攻略分区" },
  { key: "forum", label: "论坛分区" },
  { key: "video", label: "视频分区" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-border-subtle pb-2 font-mono text-caption uppercase tracking-[0.3em] text-faint">
      {children}
    </h3>
  );
}

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
      <p className="text-caption text-faint">
        总板块 = 全站各分区的结构与内容总管理；单分区日常管理请用分区页内的板块管理入口。
      </p>
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
        <section aria-label="Wiki 分区管理" className="space-y-8">
          <div className="space-y-4">
            <SectionTitle>分类结构</SectionTitle>
            <TaxonomyManager fixedKind="wiki" hideTabs />
          </div>
          <div className="space-y-4">
            <SectionTitle>词条内容</SectionTitle>
            <AdminContentList kind="wiki" />
          </div>
        </section>
      )}
      {tab === "guide" && (
        <section aria-label="攻略分区管理" className="space-y-8">
          <div className="space-y-4">
            <SectionTitle>分类结构</SectionTitle>
            <TaxonomyManager fixedKind="guide" hideTabs />
          </div>
          <div className="space-y-4">
            <SectionTitle>攻略内容</SectionTitle>
            <AdminContentList kind="guide" />
          </div>
        </section>
      )}
      {tab === "forum" && (
        <section aria-label="论坛分区管理" className="space-y-8">
          <div className="space-y-4">
            <SectionTitle>板块结构</SectionTitle>
            <TaxonomyManager fixedKind="forum" hideTabs />
          </div>
          <ForumThreadAdmin />
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
