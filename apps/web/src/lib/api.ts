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

  /** 点赞 / 取消点赞（幂等 204，契约 PR #52） */
  like: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/like`, { method: "PUT" }),
  unlike: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/like`, { method: "DELETE" }),

  /** 收藏 / 取消收藏（幂等 204） */
  bookmark: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/bookmark`, { method: "PUT" }),
  unbookmark: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/bookmark`, { method: "DELETE" }),
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

  /** 提交/更新我的评分（POST，幂等），返回最新汇总 */
  rate: (slug: string, score: number) =>
    request<{ data: RatingSummary }>(`/guides/${slug}/ratings`, {
      method: "POST",
      body: { score },
    }).then((r) => r.data),

  comments: (slug: string, page?: number) =>
    list<Comment>(`/guides/${slug}/comments`, { page }),

  /** 点赞 / 取消点赞（幂等 204，契约 PR #52） */
  like: (slug: string) =>
    request<void>(`/guides/${slug}/like`, { method: "PUT" }),
  unlike: (slug: string) =>
    request<void>(`/guides/${slug}/like`, { method: "DELETE" }),

  /** 收藏 / 取消收藏（幂等 204） */
  bookmark: (slug: string) =>
    request<void>(`/guides/${slug}/bookmark`, { method: "PUT" }),
  unbookmark: (slug: string) =>
    request<void>(`/guides/${slug}/bookmark`, { method: "DELETE" }),
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

  /** 发布主题（需登录） */
  createThread: (
    boardSlug: string,
    input: { title: string; content: string; coverImage?: string | null },
  ) =>
    request<{ data: ForumThread }>(`/forum/boards/${boardSlug}/threads`, {
      method: "POST",
      body: input,
    }).then((r) => r.data),

  /** 更新主题（作者/管理员；pinned/locked 仅管理员） */
  updateThread: (
    threadId: string,
    patch: {
      title?: string;
      pinned?: boolean;
      locked?: boolean;
      coverImage?: string | null;
    },
  ) =>
    request<{ data: ForumThread }>(`/forum/threads/${threadId}`, {
      method: "PATCH",
      body: patch,
    }).then((r) => r.data),

  deleteThread: (threadId: string) =>
    request<void>(`/forum/threads/${threadId}`, { method: "DELETE" }),

  posts: (threadId: string, page?: number) =>
    list<ForumPost>(`/forum/threads/${threadId}/posts`, { page }),

  /** 发表回复（需登录） */
  createPost: (threadId: string, content: string) =>
    request<{ data: ForumPost }>(`/forum/threads/${threadId}/posts`, {
      method: "POST",
      body: { content },
    }).then((r) => r.data),

  deletePost: (postId: string) =>
    request<void>(`/forum/posts/${postId}`, { method: "DELETE" }),

  likePost: (postId: string) =>
    request<void>(`/forum/posts/${postId}/like`, { method: "PUT" }),

  unlikePost: (postId: string) =>
    request<void>(`/forum/posts/${postId}/like`, { method: "DELETE" }),

  bookmark: (threadId: string) =>
    request<void>(`/forum/threads/${threadId}/bookmark`, { method: "PUT" }),

  unbookmark: (threadId: string) =>
    request<void>(`/forum/threads/${threadId}/bookmark`, { method: "DELETE" }),

  /** 主题点赞 / 取消点赞（幂等 204，契约 PR #52） */
  likeThread: (threadId: string) =>
    request<void>(`/forum/threads/${threadId}/like`, { method: "PUT" }),

  unlikeThread: (threadId: string) =>
    request<void>(`/forum/threads/${threadId}/like`, { method: "DELETE" }),
};

// ---------- 评论（写操作） ----------

export const commentApi = {
  /** 发表评论：target 为 wiki 页或攻略的 slug */
  create: (targetType: "wiki" | "guide", slug: string, content: string) =>
    request<{ data: Comment }>(
      targetType === "wiki"
        ? `/wiki/pages/${slug}/comments`
        : `/guides/${slug}/comments`,
      { method: "POST", body: { content } },
    ).then((r) => r.data),

  remove: (commentId: string) =>
    request<void>(`/comments/${commentId}`, { method: "DELETE" }),

  like: (commentId: string) =>
    request<void>(`/comments/${commentId}/like`, { method: "PUT" }),

  unlike: (commentId: string) =>
    request<void>(`/comments/${commentId}/like`, { method: "DELETE" }),
};

// ---------- 搜索 ----------

export const searchApi = {
  search: (q: string, kind?: "all" | "wiki" | "guide" | "forum", page?: number) =>
    list<SearchResult>("/search", { q, kind, page }),
};
