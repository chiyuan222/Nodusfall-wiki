import type { Metadata } from "next";
import { GuideEditor } from "@/components/guides/guide-editor";

export const metadata: Metadata = { title: "撰写攻略" };

/** 撰写攻略（需登录）。 */
export default function NewGuidePage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Guide Editor
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">撰写攻略</h1>
        <p className="mt-2 text-small text-secondary">
          保存为草稿可稍后继续；发布后将在攻略区公开展示并接受评分。
        </p>
      </header>
      <GuideEditor mode="create" />
    </div>
  );
}
