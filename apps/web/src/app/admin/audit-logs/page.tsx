import type { Metadata } from "next";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";

export const metadata: Metadata = {
  title: "操作日志",
  robots: { index: false },
};

export default function AdminAuditLogsPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Audit
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">操作日志</h1>
        <p className="mt-2 text-small text-secondary">
          网站管理操作审计：谁、什么时间、做了什么。仅站长可查看。
        </p>
      </header>
      <AuditLogViewer />
    </div>
  );
}
