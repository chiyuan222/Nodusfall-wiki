import type { Metadata } from "next";
import { HomeEditor } from "@/components/admin/home-editor";

export const metadata: Metadata = {
  title: "首页内容管理",
  description: "编辑首页的横幅、公告条与入口卡，导出内容配置 JSON。",
  robots: { index: false },
};

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-page">
      <HomeEditor />
    </div>
  );
}
