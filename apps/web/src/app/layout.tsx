import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "源初之结 Nodusfall Wiki — 非官方玩家 Wiki / 攻略 / 论坛",
    template: "%s · Nodusfall Wiki",
  },
  description:
    "《源初之结》（Nodusfall）非官方玩家社区：Wiki 资料库、玩家攻略与讨论论坛。",
  openGraph: {
    siteName: "Nodusfall Wiki（非官方）",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
        <SiteFooter />
        <BottomTabBar />
      </body>
    </html>
  );
}
