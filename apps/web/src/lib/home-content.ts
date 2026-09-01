import type { MediaSlot } from "./world-content";

/**
 * 首页的内容契约（前端侧）
 * 唯一数据源：apps/web/public/content/home-page.json
 * 管理员可在 /admin/home 可视化编辑后导出替换；后端 CMS 契约冻结后改由接口下发。
 *
 * 注意：本文件只允许纯类型与常量（客户端组件也会引用）。
 * 读取 JSON 的服务端加载器在 ./home-content.server.ts。
 */

/** 轮播槽跳转类型（契约 openapi.yaml HomeHero.slides.items.linkKind） */
export type HomeSlideLinkKind =
  | "wiki"
  | "guide"
  | "forum"
  | "home"
  | "world"
  | "external";

/** 首屏轮播槽位（契约对齐 PR #50）：媒体 + 可选叠加标题 + 可选跳转（管理员在 /admin/home 维护，共 5 个轮替位） */
export interface HomeHeroSlide {
  media: MediaSlot;
  /** 叠加在图片上的标题（可留空，留空时显示首页主标题） */
  title?: string;
  /** 跳转类型；与 linkTarget 同时缺省 = 不可点击 */
  linkKind?: HomeSlideLinkKind;
  /** 跳转目标：wiki/guide 传 slug，forum 传 threadId，external 传完整 URL，home/world 可留空 */
  linkTarget?: string;
}

/** 由契约字段还原前端路由（linkKind/linkTarget → href） */
export function slideHref(slide: HomeHeroSlide): string {
  const target = slide.linkTarget ?? "";
  switch (slide.linkKind) {
    case "wiki":
      return target ? `/wiki/${target}` : "";
    case "guide":
      return target ? `/guides/${target}` : "";
    case "forum":
      return target ? `/forum/threads/${target}` : "";
    case "home":
      return "/";
    case "world":
      return "/world";
    case "external":
      return target;
    default:
      return "";
  }
}

/** 旧版 href → 契约 linkKind/linkTarget（normalize 迁移用） */
export function hrefToSlideLink(
  href: string,
): Pick<HomeHeroSlide, "linkKind" | "linkTarget"> {
  if (!href) return {};
  if (/^https?:\/\//.test(href)) return { linkKind: "external", linkTarget: href };
  let m = href.match(/^\/wiki\/(.+)$/);
  if (m) return { linkKind: "wiki", linkTarget: m[1] };
  m = href.match(/^\/guides\/(.+)$/);
  if (m) return { linkKind: "guide", linkTarget: m[1] };
  m = href.match(/^\/forum\/threads\/(.+)$/);
  if (m) return { linkKind: "forum", linkTarget: m[1] };
  if (href === "/" ) return { linkKind: "home" };
  if (href === "/world") return { linkKind: "world" };
  return { linkKind: "external", linkTarget: href };
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

/** 兼容旧版配置：hero.media（单媒体）→ hero.slides；旧槽位 {caption, href} → 契约 {title, linkKind, linkTarget} */
export function normalizeHomeContent(raw: HomePageContent): HomePageContent {
  const hero = raw.hero as HomeHero & { media?: MediaSlot };
  if (!Array.isArray(hero.slides)) {
    hero.slides = hero.media
      ? [{ media: hero.media }]
      : [];
  }
  hero.slides = hero.slides.map((s) => {
    const legacy = s as HomeHeroSlide & { caption?: string; href?: string };
    const next: HomeHeroSlide = { media: legacy.media };
    next.title = legacy.title ?? legacy.caption ?? "";
    if (legacy.linkKind) {
      next.linkKind = legacy.linkKind;
      next.linkTarget = legacy.linkTarget;
    } else if (legacy.href) {
      Object.assign(next, hrefToSlideLink(legacy.href));
    }
    return next;
  });
  delete hero.media;
  // digest 栏位缺省 mode=auto（契约默认）
  for (const key of ["latest", "featured"] as const) {
    const col = raw.digest?.[key];
    if (col && col.mode !== "manual") col.mode = col.mode ?? "auto";
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

/** 动态/精华条目：接口不可用时的兜底条目（正常由 GET /home/digest 聚合提供，见 lib/digest-data.ts） */
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
  /** 契约 PR #50：auto 由后端 GET /home/digest 聚合（接口失败回退手填 items）；manual 始终使用手填 items */
  mode?: "auto" | "manual";
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
  title: "",
});
