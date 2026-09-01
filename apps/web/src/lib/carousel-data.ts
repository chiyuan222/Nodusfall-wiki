import { API_BASE_URL } from "./api-client";
import type { CarouselSlide } from "@/components/carousel";

/**
 * Wiki / 攻略 / 论坛首页轮播推荐框的数据源（仅服务端组件使用）。
 *
 * 契约现状（openapi.yaml，PR #39 冻结）：WikiPageSummary / GuideSummary /
 * ForumThreadSummary 均含列表级 coverImage，轮播直读该字段，不再请求详情。
 *
 * 每个来源最多取 5 条；coverImage 为空时该条目仍进轮播，由组件渲染占位线稿。
 * 全部请求失败时返回空数组（页面只显示 5 个空槽）。
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

interface SummaryBase {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  pinned?: boolean;
  rating?: number;
}

/** Wiki 首页轮播：最新条目（最多 5 条），点击跳转对应词条 */
export async function getWikiCarousel(): Promise<CarouselSlide[]> {
  const list = await tryFetch<ListResult<SummaryBase>>("/wiki/pages?perPage=5");
  if (!list) return [];
  return list.data.slice(0, 5).map((it) => ({
    href: `/wiki/${it.slug}`,
    title: it.title,
    subtitle: it.excerpt ?? undefined,
    image: it.coverImage ?? undefined,
    alt: it.title,
  }));
}

/** 攻略首页轮播：最新攻略（最多 5 条），角标显示评分 */
export async function getGuideCarousel(): Promise<CarouselSlide[]> {
  const list = await tryFetch<ListResult<SummaryBase>>("/guides?perPage=5");
  if (!list) return [];
  return list.data.slice(0, 5).map((it) => ({
    href: `/guides/${it.slug}`,
    title: it.title,
    subtitle: it.excerpt ?? undefined,
    badge:
      typeof it.rating === "number" && it.rating > 0
        ? `评分 ${it.rating.toFixed(1)}`
        : undefined,
    image: it.coverImage ?? undefined,
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
  return [...list.data]
    .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))
    .slice(0, 5)
    .map((it) => ({
      href: `/forum/threads/${it.id}`,
      title: it.title,
      subtitle: first.name,
      badge: it.pinned ? "置顶" : undefined,
      image: it.coverImage ?? undefined,
      alt: it.title,
    }));
}
