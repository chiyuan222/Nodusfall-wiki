import type { components } from "../lib/schema";

/**
 * Mock 数据层（契约冻结前的布局联调用）
 *
 * - 形状严格来自 `pnpm codegen` 生成的 schema.d.ts，不手写任何契约外字段
 * - 文案全部为「Mock/边界测试」占位，不含任何游戏设定，上线前不得残留
 * - 启用方式：NEXT_PUBLIC_USE_MOCK=1（见 src/lib/data.ts）
 */

type S<T extends keyof components["schemas"]> = components["schemas"][T];

export type WikiPageSummary = S<"WikiPageSummary">;
export type GuideSummary = S<"GuideSummary">;
export type ForumBoard = S<"ForumBoard">;
export type ForumThreadSummary = S<"ForumThreadSummary">;
export type WikiCategory = S<"WikiCategory">;
export type Comment = S<"Comment">;
export type Pagination = S<"Pagination">;

const now = "2026-09-01T04:00:00.000Z";

let mockSiteId = 1000000;
const user = (id: string, name: string): S<"UserSummary"> => ({
  id,
  siteId: mockSiteId++,
  username: name.toLowerCase(),
  displayName: name,
  role: "member",
  status: "active",
  group: "verified",
  level: 3,
  createdAt: now,
});

export const mockUsers = {
  weaver: user("00000000-0000-4000-8000-000000000001", "Mock织者"),
  archivist: user("00000000-0000-4000-8000-000000000002", "Mock编目员"),
};

export function mockPagination(total: number, perPage = 20): Pagination {
  return {
    page: 1,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    hasMore: total > perPage,
  };
}

/* ---------- Wiki ---------- */

export const mockWikiCategories: WikiCategory[] = [
  { id: "c-01", slug: "mock-setting", name: "Mock 分类：设定", description: "布局测试用分类", sortOrder: 1 },
  { id: "c-02", slug: "mock-system", name: "Mock 分类：系统", description: "布局测试用分类", sortOrder: 2 },
  { id: "c-03", slug: "mock-item", name: "Mock 分类：物品", description: "布局测试用分类", sortOrder: 3 },
];

export const mockWikiPages: WikiPageSummary[] = [
  {
    id: "w-01",
    slug: "mock-entry-alpha",
    title: "Mock 条目：常规长度标题",
    excerpt: "这是一条用于布局测试的摘要，长度适中，不含任何真实设定。",
    coverImage: null,
    categorySlug: "mock-setting",
    tags: ["mock", "设定"],
    status: "published",
    author: mockUsers.archivist,
    updatedAt: now,
    viewCount: 128,
    likeCount: 12,
    likedByMe: false,
    bookmarkedByMe: false,
    dislikeCount: 0,
    dislikedByMe: false,
  },
  {
    id: "w-02",
    slug: "mock-entry-long-title",
    title: "Mock 边界测试：这是一个故意写得非常非常长的条目标题用来验证换行与截断表现是否优雅",
    excerpt: "长标题 + 多标签组合的极端情况。",
    coverImage: null,
    categorySlug: "mock-system",
    tags: ["mock", "边界", "标签甲", "标签乙", "标签丙", "标签丁"],
    status: "published",
    author: mockUsers.weaver,
    updatedAt: now,
    viewCount: 56,
    likeCount: 4,
    likedByMe: false,
    bookmarkedByMe: true,
    dislikeCount: 0,
    dislikedByMe: false,
  },
  {
    id: "w-03",
    slug: "mock-entry-minimal",
    title: "Mock 条目：无标签",
    excerpt: "无标签条目的渲染。",
    coverImage: null,
    categorySlug: "mock-item",
    tags: [],
    status: "published",
    author: mockUsers.archivist,
    updatedAt: now,
    viewCount: 3,
    likeCount: 0,
    likedByMe: false,
    bookmarkedByMe: false,
    dislikeCount: 0,
    dislikedByMe: false,
  },
];

/* ---------- 攻略 ---------- */

export const mockGuides: GuideSummary[] = [
  {
    id: "g-01",
    slug: "mock-guide-rated",
    title: "Mock 攻略：高评分常规卡",
    excerpt: "评分 4.8 / 127 人，用于验证评分徽章与摘要对齐。",
    coverImage: null,
    tags: ["mock", "流派"],
    status: "published",
    author: mockUsers.weaver,
    rating: 4.8,
    ratingCount: 127,
    updatedAt: now,
    viewCount: 1024,
    likeCount: 88,
    likedByMe: true,
    bookmarkedByMe: false,
    dislikeCount: 0,
    dislikedByMe: false,
  },
  {
    id: "g-02",
    slug: "mock-guide-zero",
    title: "Mock 边界测试：零评分攻略的展示与占位样式验证",
    excerpt: "rating = 0、无评分数的边界情况。",
    coverImage: null,
    tags: [],
    status: "published",
    author: mockUsers.archivist,
    rating: 0,
    updatedAt: now,
    viewCount: 7,
    likeCount: 0,
    likedByMe: false,
    bookmarkedByMe: false,
    dislikeCount: 0,
    dislikedByMe: false,
  },
];

/* ---------- 论坛 ---------- */

export const mockForumBoards: ForumBoard[] = [
  { id: "b-01", slug: "mock-general", name: "Mock 板块：综合讨论", description: "布局测试", sortOrder: 1, threadCount: 12 },
  { id: "b-02", slug: "mock-help", name: "Mock 板块：求助", description: "布局测试", sortOrder: 2, threadCount: 0 },
  { id: "b-03", slug: "mock-share", name: "Mock 板块：分享", sortOrder: 3, threadCount: 3 },
];

export const mockThreads: ForumThreadSummary[] = [
  {
    id: "t-01",
    boardSlug: "mock-general",
    title: "Mock 主题：置顶 + 锁定的组合样式",
    excerpt: "服务端取正文前 160 字符纯文本的占位摘要。",
    coverImage: null,
    bookmarkedByMe: true,
    author: mockUsers.weaver,
    pinned: true,
    locked: true,
    replyCount: 34,
    likeCount: 56,
    likedByMe: false,
    viewCount: 320,
    createdAt: now,
    updatedAt: now,
    lastPostAt: now,
  },
  {
    id: "t-02",
    boardSlug: "mock-general",
    title: "Mock 边界测试：超长主题标题用来验证列表行内截断与徽章共存时的宽度分配是否合理",
    excerpt: "超长标题 + 零回复 + 无封面的边界组合。",
    coverImage: null,
    bookmarkedByMe: false,
    author: mockUsers.archivist,
    pinned: false,
    locked: false,
    replyCount: 0,
    likeCount: 0,
    likedByMe: false,
    viewCount: 12,
    createdAt: now,
    updatedAt: now,
    lastPostAt: now,
  },
  {
    id: "t-03",
    boardSlug: "mock-general",
    title: "Mock 主题：常规讨论",
    excerpt: "常规主题的摘要占位。",
    coverImage: null,
    bookmarkedByMe: false,
    author: mockUsers.weaver,
    pinned: false,
    locked: false,
    replyCount: 7,
    likeCount: 3,
    likedByMe: true,
    viewCount: 45,
    createdAt: now,
    updatedAt: now,
    lastPostAt: now,
  },
];
