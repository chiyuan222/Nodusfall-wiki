import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-web",
  display: "swap",
});
import { SiteHeader } from "@/components/site-header";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SectionGate } from "@/components/section-gate";

export const metadata: Metadata = {
  title: {
    default: "源神小窝 — 源初之结非官方 Wiki / 攻略 / 论坛",
    template: "%s · 源神小窝",
  },
  description:
    "源神小窝：《源初之结》（Nodusfall）非官方玩家社区——Wiki 资料库、玩家攻略与讨论论坛。",
  openGraph: {
    siteName: "源神小窝（源初之结非官方 Wiki）",
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
    <html lang="zh-CN" className={jetBrainsMono.variable}>
      <head>
        {/* 主题初始化：首帧前恢复用户选择，避免闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('nodusfall.theme.v1');if(t==='starlight'||t==='oracle')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        {/* 衬线标题 webfont（display=swap；加载失败时回落 tokens.css 本地衬线栈）。
            思源宋体 CJK 无法经 next/font 子集化，故用 <link> 引入。 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&display=swap"
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-6 md:px-6">
          <SectionGate>{children}</SectionGate>
        </main>
        <SiteFooter />
        <BottomTabBar />
      </body>
    </html>
  );
}
