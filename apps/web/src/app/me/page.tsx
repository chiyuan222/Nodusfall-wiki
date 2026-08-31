import type { Metadata } from "next";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "用户中心" };

export default function MePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h1 font-semibold">用户中心</h1>

      {/* 移动端的外观设置入口（桌面端在顶部导航） */}
      <section
        aria-labelledby="appearance"
        className="rounded-md border border-border-subtle bg-surface p-4"
      >
        <h2 id="appearance" className="mb-3 text-small font-semibold text-secondary">
          外观 · 美术主题
        </h2>
        <ThemeSwitcher />
      </section>

      <EmptyState
        title="需要登录"
        description="我的攻略、帖子与收藏将在契约补充对应端点后开放（提案 §6.2）。"
        action={{ href: "/login", label: "去登录" }}
      />
    </div>
  );
}
