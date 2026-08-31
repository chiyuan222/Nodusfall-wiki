import { API_BASE_URL } from "./api-client";
import {
  mockForumBoards,
  mockGuides,
  mockPagination,
  mockThreads,
  mockWikiCategories,
  mockWikiPages,
  type ForumBoard,
  type ForumThreadSummary,
  type GuideSummary,
  type Pagination,
  type WikiCategory,
  type WikiPageSummary,
} from "../mocks/fixtures";

/**
 * 数据访问层（契约冻结前的过渡形态）
 *
 * 策略：真实 API 优先；请求失败时——
 * - NEXT_PUBLIC_USE_MOCK=1 → 回退到 mock 数据（src/mocks/fixtures.ts），
 *   用于无后端环境下验证列表/详情布局与边界情况
 * - 未开启 mock → 返回 null，页面保持现有空态骨架
 *
 * 契约冻结后：删除 mock 分支即可，请求路径与形状已对齐 openapi.yaml。
 */

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

interface ListResult<T> {
  data: T[];
  pagination: Pagination;
}

/** 只读请求；任何失败（网络/非 2xx）返回 null，由调用方决定回退策略 */
async function tryFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface WikiIndexData {
  categories: WikiCategory[];
  pages: ListResult<WikiPageSummary>;
}

export async function getWikiIndexData(): Promise<WikiIndexData | null> {
  const [categories, pages] = await Promise.all([
    tryFetch<{ data: WikiCategory[] }>("/wiki/categories"),
    tryFetch<ListResult<WikiPageSummary>>("/wiki/pages"),
  ]);
  if (categories && pages) return { categories: categories.data, pages };
  if (!USE_MOCK) return null;
  return {
    categories: mockWikiCategories,
    pages: { data: mockWikiPages, pagination: mockPagination(mockWikiPages.length) },
  };
}

export async function getGuideList(): Promise<ListResult<GuideSummary> | null> {
  const real = await tryFetch<ListResult<GuideSummary>>("/guides");
  if (real) return real;
  if (!USE_MOCK) return null;
  return { data: mockGuides, pagination: mockPagination(mockGuides.length) };
}

export interface ForumIndexData {
  boards: ForumBoard[];
  threads: ListResult<ForumThreadSummary>;
}

export async function getForumIndexData(): Promise<ForumIndexData | null> {
  const boards = await tryFetch<{ data: ForumBoard[] }>("/forum/boards");
  if (boards) {
    // 契约冻结后：首个板块作为首页帖子流来源，slug 来自真实数据而非硬编码
    const firstSlug = boards.data[0]?.slug;
    const threads = firstSlug
      ? await tryFetch<ListResult<ForumThreadSummary>>(`/forum/boards/${firstSlug}/threads`)
      : null;
    return {
      boards: boards.data,
      threads: threads ?? { data: [], pagination: mockPagination(0) },
    };
  }
  if (!USE_MOCK) return null;
  return {
    boards: mockForumBoards,
    threads: { data: mockThreads, pagination: mockPagination(mockThreads.length) },
  };
}
