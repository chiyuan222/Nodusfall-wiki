import { API_BASE_URL } from "./api-client";
import type { CarouselSlide } from "@/components/carousel";

/**
 * Wiki / 攻略 / 论坛首页轮播推荐框的数据源（仅服务端组件使用）。
 *
 * 契约现状（openapi.yaml）：列表接口（WikiPageSummary / GuideSummary /
 * ForumThreadSummary）不含封面图字段，因此轮播图取自详情接口的 content
 * 正文中的第一张图片（Markdown 图片或 <img>）。
 *
 * 每个来源最多取 5 条；详情请求失败 / 正文无图时该条目仍进轮播，
 * 由组件渲染占位线稿。全部请求失败时返回空数组（页面只显示 5 个空槽）。
 */

interface ListResult<T> {
  data: T[];
}

async function tryFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 从 Markdown / HTML 正文中提取第一张图片地址 */
export function extractFirstImage(content: string): string | undefined {
  const md = /!\[[^\]]*\]\(\s*([^)\s"']+)/.exec(content);
  if (md?.[1]) return md[1];
  const html = /<img[^>]+src=["']([^"']+)["']/i.exec(content);
  if (html?.[1]) return html[1];
  return undefined;
}

interface SummaryBase {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  pinned?: boolean;
  rating?: number;
  boardSlug?: string;
}

/** 并发取详情首图；单条失败不拖垮整组 */
async function withImages<T extends SummaryBase>(
  items: T[],
  detailPath: (item: T) => string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    items.map(async (item) => {
      const detail = await tryFetch<{ data?: { content?: string } }>(
        detailPath(item),
      );
      const img = detail?.data?.content
        ? extractFirstImage(detail.data.content)
        : undefined;
      if (img) map.set(item.id, img);
    }),
  );
  return map;
}

/** Wiki 首页轮播：最新条目（最多 5 条），点击跳转对应词条 */
export async function getWikiCarousel(): Promise<CarouselSlide[]> {
  const list = await tryFetch<ListResult<SummaryBase & { categorySlug?: string }>>(
    "/wiki/pages?perPage=5",
  );
  if (!list) return [];
  const items = list.data.slice(0, 5);
  const images = await withImages(items, (it) => `/wiki/pages/${it.slug}`);
  return items.map((it) => ({
    href: `/wiki/${it.slug}`,
    title: it.title,
    subtitle: it.excerpt,
    image: images.get(it.id),
    alt: it.title,
  }));
}

/** 攻略首页轮播：最新攻略（最多 5 条），角标显示评分 */
export async function getGuideCarousel(): Promise<CarouselSlide[]> {
  const list = await tryFetch<ListResult<SummaryBase>>("/guides?perPage=5");
  if (!list) return [];
  const items = list.data.slice(0, 5);
  const images = await withImages(items, (it) => `/guides/${it.slug}`);
  return items.map((it) => ({
    href: `/guides/${it.slug}`,
    title: it.title,
    subtitle: it.excerpt,
    badge:
      typeof it.rating === "number" && it.rating > 0
        ? `评分 ${it.rating.toFixed(1)}`
        : undefined,
    image: images.get(it.id),
    alt: it.title,
  }));
}

/** 论坛首页轮播：首个板块的帖子（置顶优先，最多 5 条），点击跳转帖子 */
export async function getForumCarousel(): Promise<CarouselSlide[]> {
  const boards = await tryFetch<ListResult<{ slug: string; name: string }>>(
    "/forum/boards",
  );
  const first = boards?.data?.[0];
  if (!first) return [];
  const list = await tryFetch<ListResult<SummaryBase>>(
    `/forum/boards/${first.slug}/threads?perPage=5&sort=lastPostAt`,
  );
  if (!list) return [];
  const items = [...list.data]
    .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))
    .slice(0, 5);
  const images = await withImages(items, (it) => `/forum/threads/${it.id}`);
  return items.map((it) => ({
    href: `/forum/threads/${it.id}`,
    title: it.title,
    subtitle: first.name,
    badge: it.pinned ? "置顶" : undefined,
    image: images.get(it.id),
    alt: it.title,
  }));
}
