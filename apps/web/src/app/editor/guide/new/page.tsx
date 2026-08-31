import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "撰写攻略" };

/** 攻略编辑器骨架：Markdown 编辑器（预览、图片上传、本地草稿）在阶段 5 实现 */
export default function NewGuidePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h1 font-semibold">撰写攻略</h1>
      <EmptyState
        title="编辑器组装中"
        description="Markdown 双栏编辑器、图片上传（POST /v1/uploads）与本地草稿将在阶段 5 开放。"
        action={{ href: "/guides", label: "返回攻略列表" }}
      />
    </div>
  );
}
