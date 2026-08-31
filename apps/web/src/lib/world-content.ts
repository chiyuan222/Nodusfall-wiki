/**
 * /world 游戏总览页的内容契约（前端侧）
 * 唯一数据源：apps/web/public/content/world-page.json
 * 管理员可在 /admin/world 可视化编辑后导出替换；后端 CMS 契约冻结后改由接口下发。
 * 未填写（空字符串）的文案槽位，页面会渲染为「待管理员补充」占位，不会显示虚假内容。
 *
 * 注意：本文件只允许纯类型与常量（客户端组件也会引用）。
 * 读取 JSON 的服务端加载器在 ./world-content.server.ts。
 */

export interface WorldImage {
  /** 相对 public 的路径，如 /content/hero-key-art.webp；留空则渲染占位画框 */
  src: string;
  alt: string;
}

export interface WorldHero {
  hidden?: boolean;
  kicker: string;
  title: string;
  subtitle: string;
  lead: string;
  art: WorldImage;
  chips: { label: string; value: string }[];
  ctas: { label: string; href: string; style: "primary" | "ghost" }[];
}

export interface WorldOverview {
  hidden?: boolean;
  title: string;
  lead: string;
  facts: { label: string; value: string }[];
}

export interface WorldviewEntry {
  no: string;
  title: string;
  en: string;
  body: string;
  /** 来源标注：官方已确认 / 画面观测 / 待确认 */
  tag: string;
  image: WorldImage;
}

export interface WorldWorldview {
  hidden?: boolean;
  title: string;
  intro: string;
  entries: WorldviewEntry[];
}

export interface GameplayFeature {
  no: string;
  title: string;
  body: string;
  image: WorldImage;
}

export interface WorldGameplay {
  hidden?: boolean;
  title: string;
  intro: string;
  features: GameplayFeature[];
}

export interface WorldOfficial {
  hidden?: boolean;
  title: string;
  links: { label: string; url: string; desc: string }[];
}

export interface WorldNews {
  hidden?: boolean;
  title: string;
  emptyText: string;
  items: { date: string; tag: string; title: string; url: string; excerpt: string }[];
}

export type WorldSectionId =
  | "hero"
  | "overview"
  | "worldview"
  | "gameplay"
  | "official"
  | "news";

export interface WorldPageContent {
  meta: { pageId: string; updatedAt: string; maintainer: string; note: string };
  /** 板块渲染顺序；从数组中移除即隐藏该板块 */
  sections: WorldSectionId[];
  hero: WorldHero;
  overview: WorldOverview;
  worldview: WorldWorldview;
  gameplay: WorldGameplay;
  official: WorldOfficial;
  news: WorldNews;
}

export const WORLD_SECTION_LABEL: Record<WorldSectionId, string> = {
  hero: "首屏",
  overview: "概览",
  worldview: "世界观",
  gameplay: "玩法",
  official: "官方",
  news: "动态",
};
