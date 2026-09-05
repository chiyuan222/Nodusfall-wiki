import type { components } from "./schema";

/**
 * 权限体系 v2（契约 PR #119）：角色枚举与权限开关的唯一事实源。
 * role: member / wiki_editor / guide_editor / video_editor /
 *       wiki_moderator / guide_moderator / video_moderator / forum_moderator /
 *       admin / owner
 */

export type Role = components["schemas"]["UserSummary"]["role"];
export type Permission = NonNullable<
  components["schemas"]["User"]["permissions"]
>[number];

export const ROLE_LABEL: Record<Role, string> = {
  member: "成员",
  wiki_editor: "Wiki 小编",
  guide_editor: "攻略小编",
  video_editor: "视频小编",
  wiki_moderator: "Wiki 版主",
  guide_moderator: "攻略版主",
  video_moderator: "视频版主",
  forum_moderator: "论坛版主",
  admin: "管理员",
  owner: "站长",
};

export const roleLabel = (role?: string): string =>
  ROLE_LABEL[(role ?? "") as Role] ?? role ?? "成员";

/** 全部 11 项权限开关（契约 PR #119） */
export const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "manage_users", label: "用户管理" },
  { key: "manage_content", label: "内容管理" },
  { key: "manage_all_boards", label: "全分区管理" },
  { key: "manage_wiki_board", label: "Wiki 分区管理" },
  { key: "manage_guide_board", label: "攻略分区管理" },
  { key: "manage_forum_board", label: "论坛分区管理" },
  { key: "manage_video_board", label: "视频分区管理" },
  { key: "manage_reports", label: "举报处理" },
  { key: "grant_wiki_create", label: "授予建词条" },
  { key: "grant_guide_create", label: "授予建攻略" },
  { key: "grant_video_share", label: "授予视频分享" },
];

/** 小编角色（可被版主分配） */
export const EDITOR_ROLES: Role[] = ["wiki_editor", "guide_editor", "video_editor"];
/** 版主角色 */
export const MODERATOR_ROLES: Role[] = [
  "wiki_moderator",
  "guide_moderator",
  "video_moderator",
  "forum_moderator",
];

/**
 * 当前操作者可分配的角色集合（层级规则，契约 PR #119）：
 * - 站长：admin + 版主 + 小编 + 成员（不含 owner）
 * - admin：版主 / 小编 / 成员（不含 admin）
 * - 版主：仅对应分区小编 / 成员
 */
export function assignableRoles(meRole?: string): Role[] {
  const r = meRole?.toLowerCase();
  if (r === "owner") return ["admin", ...MODERATOR_ROLES, ...EDITOR_ROLES, "member"];
  if (r === "admin") return [...MODERATOR_ROLES, ...EDITOR_ROLES, "member"];
  if (r === "wiki_moderator") return ["wiki_editor", "member"];
  if (r === "guide_moderator") return ["guide_editor", "member"];
  if (r === "video_moderator") return ["video_editor", "member"];
  if (r === "forum_moderator") return ["member"];
  return [];
}

/** 角色分配的操作提示文案 */
export function assignHint(meRole?: string): string {
  const r = meRole?.toLowerCase();
  if (r === "owner") return "站长可分配：管理员 / 版主 / 小编 / 成员";
  if (r === "admin") return "管理员可分配：版主 / 小编 / 成员（不可分配管理员）";
  if (MODERATOR_ROLES.includes(r as Role))
    return "版主仅可分配：本分区小编 / 成员";
  return "当前身份不可分配角色";
}

/**
 * 版主/小编的角色默认权限（仅用于管理界面「默认开关」只读展示，
 * 与后端回填的 effective permissions 对齐；实际生效以后端为准）。
 */
export const ROLE_DEFAULT_PERMISSIONS: Partial<Record<Role, Permission[]>> = {
  wiki_moderator: ["manage_wiki_board"],
  guide_moderator: ["manage_guide_board"],
  video_moderator: ["manage_video_board"],
  forum_moderator: ["manage_forum_board"],
  wiki_editor: [],
  guide_editor: [],
  video_editor: [],
};
