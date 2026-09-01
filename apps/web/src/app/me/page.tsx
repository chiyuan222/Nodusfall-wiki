import type { Metadata } from "next";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ProfilePanel } from "@/components/me/profile-panel";
import { MyContent } from "@/components/me/my-content";

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

      {/* 我的内容：我发布的主题 / 我的收藏（GET /users/me/threads、/users/me/bookmarks） */}
      <section aria-labelledby="my-content">
        <h2 id="my-content" className="mb-3 text-small font-semibold text-secondary">
          我的内容
        </h2>
        <MyContent />
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
    </div>
  );
}
