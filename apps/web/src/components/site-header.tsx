"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KnotMark } from "./knot-mark";
import { ThemeSwitcher } from "./theme-switcher";
import { AuthMenu } from "./auth-menu";
import { useSiteSections } from "@/lib/site-config";
import type { SiteSections } from "@/lib/api";

export const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/world", label: "总览" },
  { href: "/wiki", label: "Wiki" },
  { href: "/guides", label: "攻略" },
  { href: "/forum", label: "论坛" },
  // 相关视频（契约 PR #67）：short 供移动端底栏使用
  { href: "/videos", label: "相关视频", short: "视频" },
] as const;

/** 导航项 → 分区开关键（契约 PR #70；home 不隐藏，禁用走横幅/门控） */
export const NAV_SECTION: Record<string, keyof SiteSections> = {
  "/world": "world",
  "/wiki": "wiki",
  "/guides": "guides",
  "/forum": "forum",
  "/videos": "videos",
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** 桌面端顶部导航（lg 及以上显示，移动端由 BottomTabBar 替代） */
export function SiteHeader() {
  const pathname = usePathname();
  const sections = useSiteSections();
  const visibleItems = NAV_ITEMS.filter((item) => {
    const key = NAV_SECTION[item.href];
    return !key || sections[key];
  });

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border-subtle bg-surface/90 backdrop-blur lg:block">
      <div className="mx-auto flex h-14 max-w-page items-center gap-8 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-h3 font-semibold text-primary hover:text-amber"
        >
          <KnotMark size={24} />
          源神小窝
          <span className="text-caption font-normal text-faint">
            源初之结非官方wiki
          </span>
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-small transition-colors duration-fast ${
                isActive(pathname, item.href)
                  ? "bg-raised text-amber"
                  : "text-secondary hover:bg-raised hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeSwitcher compact />
          <Link
            href="/search"
            className="rounded-md px-3 py-1.5 text-small text-secondary hover:bg-raised hover:text-primary"
          >
            搜索
          </Link>
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
