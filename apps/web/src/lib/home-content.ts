import type { MediaSlot } from "./world-content";

/**
 * 首页的内容契约（前端侧）
 * 唯一数据源：apps/web/public/content/home-page.json
 * 管理员可在 /admin/home 可视化编辑后导出替换；后端 CMS 契约冻结后改由接口下发。
 *
 * 注意：本文件只允许纯类型与常量（客户端组件也会引用）。
 * 读取 JSON 的服务端加载器在 ./home-content.server.ts。
 */

/** 首屏轮播槽位：图片 + 可选叠加标题 + 可选跳转链接（管理员在 /admin/home 维护，共 5 个轮替位） */
export interface HomeHeroSlide {
  media: MediaSlot;
  /** 叠加在图片上的标题（可留空，留空时显示首页主标题） */
  caption: string;
  /** 点击跳转（站内 / 或外链；留空 = 不可点击） */
  href: string;
}

export interface HomeHero {
  hidden?: boolean;
  kicker: string;
  title: string;
  lead: string;
  /** 首屏轮播：5 个槽位，自动轮替；建议用图片（视频槽取 poster/首帧展示） */
  slides: HomeHeroSlide[];
  ctas: { label: string; href: string; style: "primary" | "ghost" }[];
}

/** 兼容旧版配置：hero.media（单媒体）→ hero.slides（轮播数组） */
export function normalizeHomeContent(raw: HomePageContent): HomePageContent {
  const hero = raw.hero as HomeHero & { media?: MediaSlot };
  if (!Array.isArray(hero.slides)) {
    hero.slides = hero.media
      ? [{ media: hero.media, caption: "", href: "" }]
      : [];
    delete hero.media;
  }
  return raw;
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
  /** 缩略图路径（可留空）；显示在条目行右侧，与文字并列 */
  image: string;
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

/** 生成一个空轮播槽位（编辑器新增槽位时使用） */
export const emptyHomeSlide = (): HomeHeroSlide => ({
  media: emptyHomeMedia(),
  caption: "",
  href: "",
});
