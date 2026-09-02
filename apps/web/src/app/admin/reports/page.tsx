import type { Metadata } from "next";
import { ReportQueue } from "@/components/admin/report-queue";

export const metadata: Metadata = {
  title: "举报处理",
  robots: { index: false },
};

export default function AdminReportsPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Reports
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">举报处理</h1>
        <p className="mt-2 text-small text-secondary">
          用户举报的内容审核队列：处理或驳回，处理结果计入操作日志。
        </p>
      </header>
      <ReportQueue />
    </div>
  );
}
