export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_FORUM: 'manage_forum',
  MANAGE_CMS: 'manage_cms',
  MANAGE_DELETION: 'manage_deletion',
  GRANT_WIKI_CREATE: 'grant_wiki_create',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function isOwner(role?: string): boolean {
  return role === 'OWNER';
}

/** 管理身份（一级管理员或站长） */
export function isManagerRole(role?: string): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}

/** 判断管理员是否具备某权限开关；owner 全权限 */
export function hasPermission(
  role: string | undefined,
  permissions: string[] | undefined,
  perm: Permission,
): boolean {
  if (role === 'OWNER') return true;
  if (role !== 'ADMIN' && role !== 'MODERATOR') return false;
  return permissions?.includes(perm) ?? false;
}
