import type { MediaSlot } from "./world-content";

/**
 * 首页的内容契约（前端侧）
 * 唯一数据源：apps/web/public/content/home-page.json
 * 管理员可在 /admin/home 可视化编辑后导出替换；后端 CMS 契约冻结后改由接口下发。
 *
 * 注意：本文件只允许纯类型与常量（客户端组件也会引用）。
 * 读取 JSON 的服务端加载器在 ./home-content.server.ts。
 */

export interface HomeHero {
  hidden?: boolean;
  kicker: string;
  title: string;
  lead: string;
  /** 首屏横幅：支持图片或视频 */
  media: MediaSlot;
  ctas: { label: string; href: string; style: "primary" | "ghost" }[];
}

/** 顶部公告条：用于站点公告或官方重大消息 */
export interface HomeNotice {
  hidden?: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
}

/** 入口卡：指向站内各内容域（总览 / Wiki / 攻略 / 论坛…），支持图片或视频 */
export interface HomeEntryCard {
  title: string;
  desc: string;
  href: string;
  media: MediaSlot;
}

export interface HomeEntries {
  hidden?: boolean;
  title: string;
  cards: HomeEntryCard[];
}

/** 动态/精华条目：管理员手填的精选链接，图片+标题简介由链接目标页承担，这里只列文本行 */
export interface HomeDigestItem {
  date: string;
  tag: string;
  title: string;
  url: string;
  excerpt: string;
}

export interface HomeDigestColumn {
  title: string;
  emptyText: string;
  items: HomeDigestItem[];
}

/** 首页两栏快报：最新动态 | 精华推荐 */
export interface HomeDigest {
  hidden?: boolean;
  latest: HomeDigestColumn;
  featured: HomeDigestColumn;
}

export type HomeSectionId = "hero" | "notice" | "digest" | "entries";

export interface HomePageContent {
  meta: { pageId: string; updatedAt: string; maintainer: string; note: string };
  sections: HomeSectionId[];
  hero: HomeHero;
  notice: HomeNotice;
  digest: HomeDigest;
  entries: HomeEntries;
}

export const HOME_SECTION_LABEL: Record<HomeSectionId, string> = {
  hero: "首屏横幅",
  notice: "公告条",
  digest: "动态与精华",
  entries: "入口卡",
};

export const emptyHomeMedia = (): MediaSlot => ({
  kind: "image",
  src: "",
  alt: "",
  poster: "",
});
