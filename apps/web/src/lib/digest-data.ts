import { API_BASE_URL } from "./api-client";
import type { components } from "./schema";
import type { HomeDigestItem } from "./home-content";

/**
 * 首页「最新动态 / 精华推荐」聚合数据源（仅服务端组件使用）。
 * 契约：GET /home/digest（openapi.yaml，PR #39 冻结）。
 *
 * 栏目标题 / 空态文案仍由 CMS（home-page.json）承担，接口只提供条目；
 * 接口失败时返回 null，由页面回退到 CMS 手填条目，保证首页永不空白。
 */

type DigestItem = components["schemas"]["DigestItem"];
type HomeDigestResponse = components["schemas"]["HomeDigestResponse"];

const KIND_TAG: Record<DigestItem["kind"], string> = {
  wiki: "Wiki",
  guide: "攻略",
  forum: "论坛",
};

/** 契约跳转约定：kind + slug/id + boardSlug → 前端路由 */
function hrefOf(item: DigestItem): string {
  switch (item.kind) {
    case "wiki":
      return `/wiki/${item.slug}`;
    case "guide":
      return `/guides/${item.slug}`;
    case "forum":
      return `/forum/threads/${item.id}`;
  }
}

function mapItem(item: DigestItem): HomeDigestItem {
  return {
    date: (item.publishedAt ?? item.createdAt).slice(0, 10),
    tag: KIND_TAG[item.kind],
    title: item.title,
    url: hrefOf(item),
    excerpt: item.excerpt ?? "",
    image: item.coverImage ?? "",
  };
}

export interface HomeDigestData {
  latest: HomeDigestItem[];
  featured: HomeDigestItem[];
}

export async function getHomeDigest(
  latestLimit = 6,
  featuredLimit = 6,
): Promise<HomeDigestData | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/home/digest?latestLimit=${latestLimit}&featuredLimit=${featuredLimit}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as HomeDigestResponse;
    return {
      latest: json.data.latest.map(mapItem),
      featured: json.data.featured.map(mapItem),
    };
  } catch {
    return null;
  }
}
