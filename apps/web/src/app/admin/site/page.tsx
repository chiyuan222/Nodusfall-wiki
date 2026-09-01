import type { Metadata } from "next";
import { SiteConfigManager } from "@/components/admin/site-config-manager";

export const metadata: Metadata = {
  title: "站点设置",
  robots: { index: false },
};

export default function AdminSitePage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Site
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">站点设置</h1>
        <p className="mt-2 text-small text-secondary">
          内容分区显示开关与论坛漂浮引流窗配置，保存后全站即时生效。
        </p>
      </header>
      <SiteConfigManager />
    </div>
  );
}
