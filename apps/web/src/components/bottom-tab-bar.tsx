"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./site-header";
import { KnotMark } from "./knot-mark";
import { useUnreadMessages } from "@/lib/messages";

/** 18px 线性图标（stroke currentColor），与站点标识同一手绘细线语言 */
function Glyph({ href, size }: { href: string; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (href) {
    case "/world":
      // 总览：星轨罗盘
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="6" />
          <ellipse cx="9" cy="9" rx="6" ry="2.6" />
          <path d="M9 3v12" opacity="0.6" />
        </svg>
      );
    case "/wiki":
      // Wiki：翻开的书
      return (
        <svg {...common}>
          <path d="M9 4.5C7.5 3.4 5 3.2 3 3.8v10c2-.6 4.5-.4 6 .7 1.5-1.1 4-1.3 6-.7v-10c-2-.6-4.5-.4-6 .7Z" />
          <path d="M9 4.5v10" opacity="0.6" />
        </svg>
      );
    case "/guides":
      // 攻略：剑（与 LOGO 同源）
      return (
        <svg {...common}>
          <path d="M13.5 2.8 6 12.4" />
          <path d="M6 12.4 4.6 15.4l2-1.2" />
          <path d="M11.4 5.4l2.2 2.2" />
          <circle cx="14.6" cy="3.4" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "/forum":
      // 论坛：对话气泡
      return (
        <svg {...common}>
          <path d="M3 4.5h12v7.5H9l-3.2 2.6v-2.6H3V4.5Z" />
          <path d="M6 7.5h6M6 9.8h4" opacity="0.6" />
        </svg>
      );
    case "/me":
      // 我的：织者剪影
      return (
        <svg {...common}>
          <circle cx="9" cy="6" r="2.6" />
          <path d="M3.8 15c.8-2.8 2.8-4.2 5.2-4.2s4.4 1.4 5.2 4.2" />
        </svg>
      );
    case "/videos":
      // 相关视频：播放符
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="13" height="10" rx="2" />
          <path d="M7.5 7.2v3.6l3.4-1.8-3.4-1.8Z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

/** 移动端底部 Tab Bar（lg 以下显示），含「我的」入口；未读消息在「我的」图标右上角显红点 */
export function BottomTabBar() {
  const pathname = usePathname();
  const unread = useUnreadMessages();
  const items = [...NAV_ITEMS, { href: "/me", label: "我的" }] as const;

  return (
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-7">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const label = "short" in item ? item.short : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-caption transition-colors duration-fast ${
                active ? "text-amber" : "text-faint hover:text-secondary"
              }`}
            >
              {/* 激活态顶部指示线 */}
              <span
                aria-hidden
                className={`absolute inset-x-6 top-0 h-0.5 rounded-full bg-amber transition-opacity duration-fast ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              {item.href === "/" ? (
                <KnotMark size={20} />
              ) : (
                <Glyph href={item.href} size={20} />
              )}
              {/* 未读消息红点（「我的」入口） */}
              {item.href === "/me" && unread > 0 && (
                <span
                  aria-label={`${unread} 条未读消息`}
                  className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] leading-none text-white"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
