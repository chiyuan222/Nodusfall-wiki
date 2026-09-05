/**
 * 权限体系 v2（契约 PR #119）
 *
 * 角色：MEMBER / *_EDITOR（分区小编）/ *_MODERATOR（分区版主）/ ADMIN / OWNER
 * 管理员(ADMIN)与站长(OWNER)默认全权限；分区角色按角色名自动映射默认权限集，
 * 存储的 permissions 数组只用于「站长追加的额外授权」。
 * 内容处置分级：下架/恢复=对应分区板块管理；账号处置（禁言/封禁）=用户管理，
 * 且只能处置角色等级严格低于自己的账号。
 */

export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_ALL_BOARDS: 'manage_all_boards',
  MANAGE_WIKI_BOARD: 'manage_wiki_board',
  MANAGE_GUIDE_BOARD: 'manage_guide_board',
  MANAGE_FORUM_BOARD: 'manage_forum_board',
  MANAGE_VIDEO_BOARD: 'manage_video_board',
  MANAGE_REPORTS: 'manage_reports',
  GRANT_WIKI_CREATE: 'grant_wiki_create',
  GRANT_GUIDE_CREATE: 'grant_guide_create',
  GRANT_VIDEO_SHARE: 'grant_video_share',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_CONTENT,
  PERMISSIONS.MANAGE_ALL_BOARDS,
  PERMISSIONS.MANAGE_WIKI_BOARD,
  PERMISSIONS.MANAGE_GUIDE_BOARD,
  PERMISSIONS.MANAGE_FORUM_BOARD,
  PERMISSIONS.MANAGE_VIDEO_BOARD,
  PERMISSIONS.MANAGE_REPORTS,
  PERMISSIONS.GRANT_WIKI_CREATE,
  PERMISSIONS.GRANT_GUIDE_CREATE,
  PERMISSIONS.GRANT_VIDEO_SHARE,
];

export type BoardKey = 'wiki' | 'guide' | 'forum' | 'video';

export const BOARDS: BoardKey[] = ['wiki', 'guide', 'forum', 'video'];

const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  MEMBER: [],
  WIKI_EDITOR: [PERMISSIONS.MANAGE_WIKI_BOARD],
  GUIDE_EDITOR: [PERMISSIONS.MANAGE_GUIDE_BOARD],
  VIDEO_EDITOR: [PERMISSIONS.MANAGE_VIDEO_BOARD],
  WIKI_MODERATOR: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_WIKI_BOARD,
    PERMISSIONS.GRANT_WIKI_CREATE,
  ],
  GUIDE_MODERATOR: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_GUIDE_BOARD,
    PERMISSIONS.GRANT_GUIDE_CREATE,
  ],
  FORUM_MODERATOR: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_FORUM_BOARD,
  ],
  VIDEO_MODERATOR: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_VIDEO_BOARD,
    PERMISSIONS.GRANT_VIDEO_SHARE,
  ],
  ADMIN: [...ALL_PERMISSIONS],
  OWNER: [...ALL_PERMISSIONS],
};

const ROLE_RANK: Record<string, number> = {
  MEMBER: 0,
  WIKI_EDITOR: 1,
  GUIDE_EDITOR: 1,
  VIDEO_EDITOR: 1,
  WIKI_MODERATOR: 2,
  GUIDE_MODERATOR: 2,
  FORUM_MODERATOR: 2,
  VIDEO_MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function isOwner(role?: string): boolean {
  return role === 'OWNER';
}

/** 管理身份：站长或管理员 */
export function isManagerRole(role?: string): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}

/** 分区版主 */
export function isModeratorRole(role?: string): boolean {
  return typeof role === 'string' && role.endsWith('_MODERATOR');
}

/** 后台工作人员：站长/管理员/分区版主/分区小编 */
export function isStaffRole(role?: string): boolean {
  if (!role) return false;
  return isManagerRole(role) || role.endsWith('_MODERATOR') || role.endsWith('_EDITOR');
}

/** 角色自动默认权限集（管理员/站长=全部） */
export function defaultPermissionsFor(role?: string): Permission[] {
  return role ? (ROLE_DEFAULT_PERMISSIONS[role] ?? []) : [];
}

/** 有效权限 = 角色默认 ∪ 存储追加（忽略已废弃 key） */
export function effectivePermissions(
  role: string | undefined,
  stored: string[] | undefined,
): string[] {
  const known = new Set<string>(ALL_PERMISSIONS);
  const def = new Set<string>(defaultPermissionsFor(role));
  for (const p of stored ?? []) {
    if (known.has(p)) def.add(p);
  }
  return [...def];
}

/**
 * 权限判定。permissions 应传「有效权限」（JWT 内为 effectivePermissions 结果）。
 * 站长/管理员天然全权限。
 */
export function hasPermission(
  role: string | undefined,
  permissions: string[] | undefined,
  perm: Permission,
): boolean {
  if (role === 'OWNER' || role === 'ADMIN') return true;
  return permissions?.includes(perm) ?? false;
}

export function boardPermissionKey(board: BoardKey): Permission {
  const map: Record<BoardKey, Permission> = {
    wiki: PERMISSIONS.MANAGE_WIKI_BOARD,
    guide: PERMISSIONS.MANAGE_GUIDE_BOARD,
    forum: PERMISSIONS.MANAGE_FORUM_BOARD,
    video: PERMISSIONS.MANAGE_VIDEO_BOARD,
  };
  return map[board];
}

/** 是否可管理指定分区板块（总板块管理 = 全分区） */
export function hasBoardPermission(
  role: string | undefined,
  permissions: string[] | undefined,
  board: BoardKey,
): boolean {
  if (hasPermission(role, permissions, PERMISSIONS.MANAGE_ALL_BOARDS)) return true;
  return hasPermission(role, permissions, boardPermissionKey(board));
}

/** 是否具备任一分区板块管理权限 */
export function hasAnyBoardPermission(
  role: string | undefined,
  permissions: string[] | undefined,
): boolean {
  return BOARDS.some((b) => hasBoardPermission(role, permissions, b));
}

export function roleRank(role?: string): number {
  return role ? (ROLE_RANK[role] ?? 0) : 0;
}

/** 是否可对目标账号执行账号级处置（只能处置等级严格低于自己的账号） */
export function canDiscipline(
  actorRole: string | undefined,
  targetRole: string | undefined,
): boolean {
  return roleRank(actorRole) > roleRank(targetRole);
}
