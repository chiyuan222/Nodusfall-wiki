import type { Metadata } from "next";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ProfilePanel } from "@/components/me/profile-panel";

export const metadata: Metadata = { title: "用户中心" };

export default function MePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h1 font-semibold">用户中心</h1>

      {/* 个人资料：GET /users/me + PATCH /users/me + 头像上传 */}
      <section aria-labelledby="profile">
        <h2 id="profile" className="sr-only">
          个人资料
        </h2>
        <ProfilePanel />
      </section>

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

      <p className="text-caption text-faint">
        「我的帖子 / 我的收藏」需要后端补充对应查询端点（提案 §6.2），已在 Issue 跟进。
      </p>
    </div>
  );
}
