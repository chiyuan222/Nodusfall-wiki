"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KnotMark } from "./knot-mark";
import { ThemeSwitcher } from "./theme-switcher";

export const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/world", label: "总览" },
  { href: "/wiki", label: "Wiki" },
  { href: "/guides", label: "攻略" },
  { href: "/forum", label: "论坛" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** 桌面端顶部导航（lg 及以上显示，移动端由 BottomTabBar 替代） */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border-subtle bg-surface/90 backdrop-blur lg:block">
      <div className="mx-auto flex h-14 max-w-page items-center gap-8 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-h3 font-semibold text-primary hover:text-amber"
        >
          <KnotMark size={24} />
          源初之结
          <span className="text-caption font-normal text-faint">非官方 Wiki</span>
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
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
          <Link
            href="/login"
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-colors duration-fast hover:opacity-90"
          >
            登录
          </Link>
        </div>
      </div>
    </header>
  );
}
