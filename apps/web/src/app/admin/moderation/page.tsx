import type { Metadata } from "next";
import { ModerationList } from "@/components/admin/moderation-list";

export const metadata: Metadata = {
  title: "内容巡查",
  robots: { index: false },
};

export default function AdminModerationPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Moderation
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">内容巡查</h1>
        <p className="mt-2 text-small text-secondary">
          五类 UGC（主题/回复/评论/Wiki/攻略）统一巡查，可查看详情或下架。
        </p>
      </header>
      <ModerationList />
    </div>
  );
}
