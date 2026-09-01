"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSiteSections } from "@/lib/site-config";
import type { SiteSections } from "@/lib/api";

/**
 * 分区门控（契约 PR #70）：挂载于根布局，包住 children。
 * 当前路由属于被禁用的分区时，显示「分区维护中」而非原页面；
 * 首页不禁用（契约冻结备注 #3：home=false 时显示横幅但不移除落点，此处不做整站门控）。
 * /admin、/me、/legal、/login、/register、/search 等系统路由永不受门控。
 */

const SECTION_ROUTES: [prefix: string, key: keyof SiteSections, label: string][] = [
  ["/world", "world", "总览"],
  ["/wiki", "wiki", "Wiki"],
  ["/guides", "guides", "攻略"],
  ["/forum", "forum", "论坛"],
  ["/videos", "videos", "相关视频"],
];

export function SectionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sections = useSiteSections();

  const hit = SECTION_ROUTES.find(([prefix]) => pathname.startsWith(prefix));
  if (hit && !sections[hit[1]]) {
    return (
      <div className="mx-auto flex max-w-reading flex-col items-center gap-4 py-24 text-center">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Maintenance
        </p>
        <h1 className="font-serif text-h1 font-semibold text-primary">
          「{hit[2]}」分区维护中
        </h1>
        <p className="text-small text-secondary">
          该分区正在调整内容，暂时关闭访问。其他分区不受影响，欢迎稍后回来。
        </p>
        <Link
          href="/"
          className="mt-2 rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          回到首页
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
