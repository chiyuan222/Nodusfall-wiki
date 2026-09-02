/**
 * 内容审核共享工具（契约 PR #90）。
 * 跳转语义：wikiPage/guide 的 id 为 slug，forumThread 为 threadId；
 * comment/forumPost 无法定位父级，返回 null（显示摘要不跳转）。
 */

export type ModerationTargetType =
  | "forumThread"
  | "forumPost"
  | "comment"
  | "wikiPage"
  | "guide";

export const TARGET_TYPE_LABEL: Record<ModerationTargetType, string> = {
  forumThread: "论坛主题",
  forumPost: "论坛回复",
  comment: "评论",
  wikiPage: "Wiki 词条",
  guide: "攻略",
};

export const REPORT_REASON_LABEL: Record<string, string> = {
  spam: "广告/垃圾信息",
  porn: "色情低俗",
  politics: "政治敏感",
  violence: "暴力血腥",
  illegal: "违法违规",
  other: "其他",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: "待处理",
  RESOLVED: "已处理",
  REJECTED: "已驳回",
};

/** 可拼则跳；comment/forumPost 无父级信息，返回 null */
export function targetUrl(type: string, targetId: string): string | null {
  switch (type) {
    case "forumThread":
      return `/forum/threads/${targetId}`;
    case "wikiPage":
      return `/wiki/${targetId}`;
    case "guide":
      return `/guides/${targetId}`;
    default:
      return null;
  }
}
