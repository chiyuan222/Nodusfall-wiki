/**
 * /world 游戏总览页的内容契约（前端侧）
 * 唯一数据源：apps/web/public/content/world-page.json
 * 管理员可在 /admin/world 可视化编辑后导出替换；后端 CMS 契约冻结后改由接口下发。
 * 未填写（空字符串）的文案槽位，页面会渲染为「待管理员补充」占位，不会显示虚假内容。
 *
 * 注意：本文件只允许纯类型与常量（客户端组件也会引用）。
 * 读取 JSON 的服务端加载器在 ./world-content.server.ts。
 */

/** 媒体槽位：图片或视频（二选一）。src 留空时渲染占位画框。 */
export interface MediaSlot {
  kind: "image" | "video";
  /** 相对 public 的路径（如 /content/hero.webp / /content/pv.mp4）或外链；留空 = 占位 */
  src: string;
  /** 图片替代文本 / 视频无障碍标签 */
  alt: string;
  /** 仅视频：封面图路径（留空则浏览器取首帧） */
  poster: string;
}

export interface WorldHero {
  hidden?: boolean;
  kicker: string;
  title: string;
  subtitle: string;
  lead: string;
  art: MediaSlot;
  chips: { label: string; value: string }[];
  ctas: { label: string; href: string; style: "primary" | "ghost" }[];
}

export interface WorldOverview {
  hidden?: boolean;
  title: string;
  lead: string;
  /** 板块主视觉：幻灯片式大图，管理员可替换 */
  media: MediaSlot;
  facts: { label: string; value: string }[];
}

export interface WorldviewEntry {
  no: string;
  title: string;
  en: string;
  body: string;
  /** 来源标注：官方已确认 / 画面观测 / 待确认 */
  tag: string;
  image: MediaSlot;
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
  image: MediaSlot;
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
  /** 板块主视觉：幻灯片式大图，管理员可替换 */
  media: MediaSlot;
  links: {
    label: string;
    url: string;
    desc: string;
    /** 渠道图标 key（契约 PR #50）：official / bilibili / douyin，缺省按 label 猜测 */
    iconKey?: string;
  }[];
}

/** 官方信息转载条目：本站转载自官方渠道的内容存档 */
export interface RepostItem {
  date: string;
  /** 来源渠道：官网 / 哔哩哔哩 / 抖音 / 微博… */
  source: string;
  title: string;
  /** 原文链接（可留空） */
  url: string;
  excerpt: string;
  media: MediaSlot;
}

export interface WorldReposts {
  hidden?: boolean;
  title: string;
  intro: string;
  emptyText: string;
  items: RepostItem[];
}

export interface NewsItem {
  date: string;
  tag: string;
  title: string;
  url: string;
  excerpt: string;
  /** 可选：带图/带视频时，该动态以「媒体 + 标题 + 简介」卡片形式展示 */
  media: MediaSlot;
}

export interface WorldNews {
  hidden?: boolean;
  title: string;
  emptyText: string;
  items: NewsItem[];
}

export type WorldSectionId =
  | "hero"
  | "overview"
  | "worldview"
  | "gameplay"
  | "official"
  | "reposts"
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
  reposts: WorldReposts;
  news: WorldNews;
}

export const WORLD_SECTION_LABEL: Record<WorldSectionId, string> = {
  hero: "首屏",
  overview: "概览",
  worldview: "世界观",
  gameplay: "玩法",
  official: "官方",
  reposts: "转载",
  news: "动态",
};

/** 生成一个空媒体槽位（编辑器新增条目时使用） */
export const emptyMedia = (): MediaSlot => ({
  kind: "image",
  src: "",
  alt: "",
  poster: "",
});

/** 兼容旧版配置：为后加的媒体槽位补默认值（旧 JSON / 后端旧 seed 不含这两个字段） */
export function normalizeWorldContent(raw: WorldPageContent): WorldPageContent {
  if (raw.overview && !raw.overview.media) raw.overview.media = emptyMedia();
  if (raw.official && !raw.official.media) raw.official.media = emptyMedia();
  return raw;
}
