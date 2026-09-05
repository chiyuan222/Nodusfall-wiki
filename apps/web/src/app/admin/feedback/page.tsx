import type { Metadata } from "next";
import { FeedbackQueue } from "@/components/admin/feedback-queue";

export const metadata: Metadata = {
  title: "反馈处理",
  robots: { index: false },
};

export default function AdminFeedbackPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Feedback
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">意见反馈</h1>
        <p className="mt-2 text-small text-secondary">
          用户反馈队列：待处理优先，站长回复后经站内信通知提交人；处理结果计入操作日志。
        </p>
      </header>
      <FeedbackQueue />
    </div>
  );
}
