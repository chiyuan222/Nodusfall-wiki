import type { Metadata } from "next";
import { WorldEditor } from "@/components/admin/world-editor";

export const metadata: Metadata = {
  title: "总览页内容管理",
  description: "编辑 /world 游戏总览页的文案、图片与板块结构，导出内容配置 JSON。",
  robots: { index: false },
};

export default function AdminWorldPage() {
  return (
    <div className="mx-auto max-w-page">
      <WorldEditor />
    </div>
  );
}
