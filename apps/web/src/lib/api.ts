/**
 * 资源层 API 助手：类型全部来自 src/lib/schema.d.ts（由 openapi.yaml 生成）。
 * 契约冻结前字段以后端最终确认为准；此处不做任何字段发明。
 */

import { request, type ListResult } from "./api-client";
import type { components } from "./schema";

type Schemas = components["schemas"];

export type UserSummary = Schemas["UserSummary"];
export type WikiCategory = Schemas["WikiCategory"];
export type WikiPageSummary = Schemas["WikiPageSummary"];
export type WikiPage = Schemas["WikiPage"];
export type WikiPageRevision = Schemas["WikiPageRevision"];
export type GuideSummary = Schemas["GuideSummary"];
export type Guide = Schemas["Guide"];
export type RatingSummary = Schemas["RatingSummary"];
export type ForumBoard = Schemas["ForumBoard"];
export type ForumThreadSummary = Schemas["ForumThreadSummary"];
export type ForumThread = Schemas["ForumThread"];
export type ForumPost = Schemas["ForumPost"];
export type Comment = Schemas["Comment"];
export type SearchResult = Schemas["SearchResult"];

interface ListEnvelope<S> {
  data: S[];
  pagination: import("./api-client").Pagination;
}

async function list<S>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<ListResult<S>> {
  const envelope = await request<ListEnvelope<S>>(path, { query });
  return { data: envelope.data, pagination: envelope.pagination };
}

// ---------- Wiki ----------

export const wikiApi = {
  categories: () =>
    request<{ data: WikiCategory[] }>("/wiki/categories").then((r) => r.data),

  pages: (query?: {
    category?: string;
    tag?: string;
    q?: string;
    sort?: "updatedAt" | "createdAt" | "title";
    page?: number;
    perPage?: number;
  }) => list<WikiPageSummary>("/wiki/pages", query),

  page: (slug: string) =>
    request<{ data: WikiPage }>(`/wiki/pages/${slug}`).then((r) => r.data),

  revisions: (slug: string, page?: number) =>
    list<WikiPageRevision>(`/wiki/pages/${slug}/revisions`, { page }),

  comments: (slug: string, page?: number) =>
    list<Comment>(`/wiki/pages/${slug}/comments`, { page }),
};

// ---------- 攻略 ----------

export const guidesApi = {
  list: (query?: {
    tag?: string;
    q?: string;
    sort?: "rating" | "updatedAt" | "createdAt";
    page?: number;
    perPage?: number;
  }) => list<GuideSummary>("/guides", query),

  get: (slug: string) =>
    request<{ data: Guide }>(`/guides/${slug}`).then((r) => r.data),

  rating: (slug: string) =>
    request<{ data: RatingSummary }>(`/guides/${slug}/ratings`).then(
      (r) => r.data,
    ),

  comments: (slug: string, page?: number) =>
    list<Comment>(`/guides/${slug}/comments`, { page }),
};

// ---------- 论坛 ----------

export const forumApi = {
  boards: () =>
    request<{ data: ForumBoard[] }>("/forum/boards").then((r) => r.data),

  threads: (
    boardSlug: string,
    query?: { sort?: "lastPostAt" | "createdAt"; page?: number },
  ) => list<ForumThreadSummary>(`/forum/boards/${boardSlug}/threads`, query),

  thread: (threadId: string) =>
    request<{ data: ForumThread }>(`/forum/threads/${threadId}`).then(
      (r) => r.data,
    ),

  posts: (threadId: string, page?: number) =>
    list<ForumPost>(`/forum/threads/${threadId}/posts`, { page }),
};

// ---------- 搜索 ----------

export const searchApi = {
  search: (q: string, kind?: "all" | "wiki" | "guide" | "forum", page?: number) =>
    list<SearchResult>("/search", { q, kind, page }),
};
