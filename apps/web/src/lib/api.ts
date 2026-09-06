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
export type MessageItem = Schemas["MessageItem"];
export type UnreadCount = Schemas["UnreadCount"];
export type VideoEntry = Schemas["VideoEntry"];
export type VideoKind = VideoEntry["kind"];
export type VideoPlatform = VideoEntry["platform"];
export type SiteSections = Schemas["SiteSections"];
export type FloatingWindows = Schemas["FloatingWindows"];
export type FloatingWindowConfig = Schemas["FloatingWindowConfig"];
export type AppearanceConfig = Schemas["AppearanceConfig"];
export type AppearanceHeading = Schemas["AppearanceHeading"];
export type UpdateAppearance = Schemas["UpdateAppearance"];

/** 契约 PR #108（意见反馈 + 私信会话化），Issue #111 修复后已由 codegen 生成 */
export type FeedbackCategory = FeedbackItem["category"];
export type FeedbackStatus = FeedbackItem["status"];
export type FeedbackItem = Schemas["FeedbackItem"];
export type DirectMessageItem = Schemas["DirectMessageItem"];
export type ConversationItem = Schemas["ConversationItem"];

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

  /** 「不推荐/内容有误」标记 / 取消（幂等 204，契约 PR #113） */
  dislike: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/dislike`, { method: "PUT" }),
  undislike: (slug: string) =>
    request<void>(`/wiki/pages/${slug}/dislike`, { method: "DELETE" }),
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

  /** 「不推荐/内容有误」标记 / 取消（幂等 204，契约 PR #113） */
  dislike: (slug: string) =>
    request<void>(`/guides/${slug}/dislike`, { method: "PUT" }),
  undislike: (slug: string) =>
    request<void>(`/guides/${slug}/dislike`, { method: "DELETE" }),
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

  /** 楼中楼回复列表（正序分页，匿名可读，契约 PR #114） */
  replies: (commentId: string, page?: number) =>
    list<Comment>(`/comments/${commentId}/replies`, { page }),

  /** 发表回复（需登录；父评论须为顶层，单层限制由后端校验） */
  createReply: (commentId: string, content: string) =>
    request<{ data: Comment }>(`/comments/${commentId}/replies`, {
      method: "POST",
      body: { content },
    }).then((r) => r.data),
};

// ---------- 搜索 ----------

export const searchApi = {
  search: (q: string, kind?: "all" | "wiki" | "guide" | "forum", page?: number) =>
    list<SearchResult>("/search", { q, kind, page }),
};

// ---------- 我的消息（私信 + 全站公告，契约 PR #59） ----------

export const messageApi = {
  /** 我的消息（私信 + 公告，时间倒序，分页） */
  list: (page?: number, perPage?: number) =>
    list<MessageItem>("/users/me/messages", { page, perPage }),

  /** 未读数（头像/入口红点）。契约 200 直接返回 UnreadCount，兼容 { data } 信封 */
  unreadCount: () =>
    request<UnreadCount | { data: UnreadCount }>(
      "/users/me/messages/unread-count",
    ).then((r) => ("data" in r ? r.data.unread : r.unread)),

  /** 发送私信（仅站长与注册用户之间；普通用户间/管理员间 403） */
  send: (recipientId: string, content: string) =>
    request<{ data: MessageItem }>("/users/me/messages", {
      method: "POST",
      body: { recipientId, content },
    }).then((r) => r.data),

  /** 全部标记已读（进入消息页后调用，红点消除，幂等 204） */
  readAll: () =>
    request<void>("/users/me/messages/read-all", { method: "POST" }),

  /** 公告历史（仅站长） */
  announcements: (page?: number) =>
    list<MessageItem>("/admin/announcements", { page }),

  /** 发布全站公告（仅站长，广播到所有用户收件箱） */
  announce: (title: string, content: string) =>
    request<{ data: MessageItem }>("/admin/announcements", {
      method: "POST",
      body: { title, content },
    }).then((r) => r.data),

  // ---------- 消息重构（契约 PR #108 B 组） ----------

  /** 我的公告（分页，含每条已读状态） */
  myAnnouncements: (page?: number, perPage?: number) =>
    list<MessageItem>("/users/me/announcements", { page, perPage }),

  /** 公告全部标记已读（进入公告页签调用，204 幂等） */
  readAllAnnouncements: () =>
    request<void>("/users/me/announcements/read-all", { method: "POST" }),

  /** 私信会话列表（updatedAt 倒序，含 peer 摘要 / 未读数 / 最后消息） */
  conversations: (page?: number, perPage?: number) =>
    list<ConversationItem>("/users/me/conversations", { page, perPage }),

  /** 与某用户的私信记录（时间倒序分页） */
  conversationMessages: (peerId: string, page?: number, perPage?: number) =>
    list<DirectMessageItem>(`/users/me/conversations/${peerId}`, {
      page,
      perPage,
    }),

  /** 发送私信（普通用户仅可发给站长；站长可发任意用户；禁止发本人） */
  sendConversation: (peerId: string, content: string) =>
    request<{ data: DirectMessageItem }>(`/users/me/conversations/${peerId}`, {
      method: "POST",
      body: { content },
    }).then((r) => r.data),

  /** 会话已读（进入聊天窗调用，清该会话未读，204 幂等） */
  readConversation: (peerId: string) =>
    request<void>(`/users/me/conversations/${peerId}/read`, {
      method: "POST",
    }),

  // ---------- 私信/公告清理（契约 PR #145，本人视角软删除） ----------

  /** 删除与该用户的私信会话（仅本人视角；204 幂等，peer 不存在 404 前端视为成功） */
  deleteConversation: (peerId: string) =>
    request<void>(`/users/me/conversations/${peerId}`, { method: "DELETE" }),

  /** 清空我的全部私信会话（204） */
  clearConversations: () =>
    request<void>("/users/me/conversations", { method: "DELETE" }),

  /** 删除单条公告（仅本人收件箱；204 幂等） */
  deleteAnnouncement: (announcementId: string) =>
    request<void>(`/users/me/announcements/${announcementId}`, {
      method: "DELETE",
    }),

  /** 清空我的全部公告（204） */
  clearAnnouncements: () =>
    request<void>("/users/me/announcements", { method: "DELETE" }),
};

// ---------- 意见反馈（契约 PR #108 A 组） ----------

export const feedbackApi = {
  /** 提交反馈（登录；当日限 10 条，超限 429） */
  create: (category: FeedbackCategory, content: string) =>
    request<{ data: FeedbackItem }>("/feedback", {
      method: "POST",
      body: { category, content },
    }).then((r) => r.data),

  /** 我的反馈记录（含站长回复，分页） */
  listMine: (page?: number, perPage?: number) =>
    list<FeedbackItem>("/users/me/feedback", { page, perPage }),

  /** 反馈队列（站长或 manage_content；可按状态筛选） */
  adminList: (status?: FeedbackStatus, page?: number, perPage?: number) =>
    list<FeedbackItem>("/admin/feedback", { status, page, perPage }),

  /** 回复/关闭反馈（仅站长；回复经站内信通知提交人） */
  handle: (feedbackId: string, status: "REPLIED" | "CLOSED", replyText?: string) =>
    request<{ data: FeedbackItem }>(`/admin/feedback/${feedbackId}`, {
      method: "PATCH",
      body: { status, ...(replyText ? { replyText } : {}) },
    }).then((r) => r.data),
};

// ---------- 相关视频导航（契约 PR #67） ----------

export interface VideoInput {
  kind: VideoKind;
  title: string;
  url: string;
  platform?: VideoPlatform;
  coverImage?: string | null;
  description?: string | null;
  published?: boolean;
  sortOrder?: number;
}

export const videoApi = {
  /** 公开列表：仅已发布，按分区筛选（匿名可访问） */
  list: (kind?: VideoKind, page?: number, perPage?: number) =>
    list<VideoEntry>("/videos", { kind, page, perPage }),

  /** 管理侧列表（含未发布；契约追加端点，未上线时由调用方回退公开列表） */
  adminList: (kind: VideoKind | undefined, page?: number) =>
    list<VideoEntry>("/admin/videos", { kind, page, perPage: 50 }),

  /** 分享视频（POST /videos，需视频分享资格或视频板块管理，契约 PR #121） */
  share: (input: VideoInput) =>
    request<{ data: VideoEntry }>("/videos", {
      method: "POST",
      body: input,
    }).then((r) => r.data),

  create: (input: VideoInput) =>
    request<{ data: VideoEntry }>("/admin/videos", {
      method: "POST",
      body: input,
    }).then((r) => r.data),

  update: (videoId: string, patch: Partial<VideoInput>) =>
    request<{ data: VideoEntry }>(`/admin/videos/${videoId}`, {
      method: "PATCH",
      body: patch,
    }).then((r) => r.data),

  remove: (videoId: string) =>
    request<void>(`/admin/videos/${videoId}`, { method: "DELETE" }),
};

// ---------- 站点配置（分区开关 + 论坛漂浮窗，契约 PR #70） ----------

export const siteApi = {
  /** 公开读分区显示开关（匿名可访问） */
  sections: () =>
    request<SiteSections | { data: SiteSections }>("/site/sections").then(
      (r) => ("data" in r ? r.data : r),
    ),

  /** 更新分区开关（owner 或 manage_cms） */
  updateSections: (patch: Partial<SiteSections>) =>
    request<SiteSections | { data: SiteSections }>("/admin/site/sections", {
      method: "PUT",
      body: patch,
    }).then((r) => ("data" in r ? r.data : r)),

  /** 公开读论坛漂浮窗配置（匿名可访问） */
  floatingWindows: () =>
    request<FloatingWindows | { data: FloatingWindows }>(
      "/site/floating-windows",
    ).then((r) => ("data" in r ? r.data : r)),

  /** 更新漂浮窗（owner 或 manage_cms；全量回传 left/right） */
  updateFloatingWindows: (config: FloatingWindows) =>
    request<FloatingWindows | { data: FloatingWindows }>(
      "/admin/site/floating-windows",
      { method: "PUT", body: config },
    ).then((r) => ("data" in r ? r.data : r)),

  /** 公开读全站标题外观配置（匿名可访问；null=跟随主题默认） */
  appearance: () =>
    request<AppearanceConfig | { data: AppearanceConfig }>(
      "/site/appearance",
    ).then((r) => ("data" in r ? r.data : r)),

  /** 部分更新标题外观（owner 或 manage_cms；显式 null 恢复默认） */
  updateAppearance: (patch: UpdateAppearance) =>
    request<AppearanceConfig | { data: AppearanceConfig }>(
      "/admin/site/appearance",
      { method: "PUT", body: patch },
    ).then((r) => ("data" in r ? r.data : r)),
};
