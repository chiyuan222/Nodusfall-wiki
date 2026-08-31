"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./site-header";
import { KnotMark } from "./knot-mark";

/** 移动端底部 Tab Bar（lg 以下显示），含「我的」入口 */
export function BottomTabBar() {
  const pathname = usePathname();
  const items = [...NAV_ITEMS, { href: "/me", label: "我的" }] as const;

  return (
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2 text-caption transition-colors duration-fast ${
                active ? "text-amber" : "text-faint hover:text-secondary"
              }`}
            >
              {item.href === "/" ? (
                <KnotMark size={20} />
              ) : (
                <span
                  aria-hidden
                  className={`block h-1 w-6 rounded-sm ${
                    active ? "bg-amber" : "bg-border-subtle"
                  }`}
                />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
