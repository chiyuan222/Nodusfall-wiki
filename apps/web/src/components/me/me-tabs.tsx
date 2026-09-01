"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProfilePanel } from "@/components/me/profile-panel";
import { MyContent } from "@/components/me/my-content";
import { MyHistory } from "@/components/me/my-history";
import { AccountSettings } from "@/components/me/account-settings";

/**
 * 用户中心四 Tab（契约 PR #45）：
 * 我的主页（资料/管理入口/退出）｜我的内容（主题/收藏/评论）｜浏览记录｜账号设置（外观/软注销）
 * 支持 ?tab=profile|content|history|settings 直达（顶栏 AuthMenu 下拉使用）。
 * 各面板自行处理未登录门禁。
 */

type Tab = "profile" | "content" | "history" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "我的主页" },
  { key: "content", label: "我的内容" },
  { key: "history", label: "浏览记录" },
  { key: "settings", label: "账号设置" },
];

export function MeTabs() {
  const [tab, setTab] = useState<Tab>("profile");
  const searchParams = useSearchParams();

  // 顶栏下拉 /me?tab=xxx 直达：查询参数变化时同步
  useEffect(() => {
    const q = searchParams.get("tab");
    if (q && (TABS as { key: string }[]).some((t) => t.key === q)) {
      setTab(q as Tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="用户中心分区"
        className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              tab === t.key
                ? "bg-amber font-medium text-amber-fg"
                : "text-secondary hover:text-amber"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 面板保持挂载，避免 Tab 切换丢失编辑态；仅视觉隐藏 */}
      <div hidden={tab !== "profile"}>
        <ProfilePanel />
      </div>
      <div hidden={tab !== "content"}>
        <MyContent />
      </div>
      <div hidden={tab !== "history"}>
        <MyHistory />
      </div>
      <div hidden={tab !== "settings"}>
        <AccountSettings />
      </div>
    </div>
  );
}
