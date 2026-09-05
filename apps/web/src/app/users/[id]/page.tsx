import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE_URL } from "@/lib/api-client";
import { Avatar } from "@/components/avatar";
import { UserStatusMark, UserGroupBadge } from "@/components/user-marks";
import { roleLabel } from "@/lib/roles";
import { PublicProfileTabs } from "@/components/users/public-profile-tabs";
import { ProfileAdminEntry } from "@/components/users/profile-admin-entry";
import type { components } from "@/lib/schema";

/**
 * 用户公开主页（契约 PR #141：GET /users/{userId} → PublicUserProfile）。
 * - 严格不含邮箱/手机等隐私字段；banned/deleted → 404；muted 可浏览只读
 * - 三个分区 Tab：主题 / 评论 / 收藏（本人隐私开关控制对外可见）
 */

export const dynamic = "force-dynamic";

type PublicUserProfile = components["schemas"]["PublicUserProfile"];

async function loadProfile(id: string): Promise<PublicUserProfile> {
  try {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, { cache: "no-store" });
    if (!res.ok) notFound();
    const json = (await res.json()) as { data: PublicUserProfile };
    return json.data;
  } catch {
    notFound();
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const profile = await loadProfile(params.id);
    return { title: `${profile.displayName} 的主页` };
  } catch {
    return { title: "用户主页" };
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await loadProfile(params.id);
  const name = profile.displayName || profile.username;

  return (
    <div className="mx-auto max-w-page space-y-8">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/" className="text-secondary transition-colors duration-fast hover:text-amber">
          首页
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{name} 的主页</span>
      </nav>

      {/* 资料卡 */}
      <header className="flex flex-wrap items-start gap-5 rounded-md border border-border-subtle bg-surface p-6">
        <Avatar url={profile.avatarUrl} name={name} size="lg" />
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-h1 font-semibold">{name}</h1>
            <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
              {roleLabel(profile.role)}
            </span>
            <UserGroupBadge group={profile.group} />
            <UserStatusMark status={profile.status} />
          </div>
          <p className="mt-1.5 font-mono text-caption text-faint">
            @{profile.username} · UID {profile.siteId} · Lv.{profile.level} ·
            注册于 {profile.createdAt.slice(0, 10)}
          </p>
          {profile.bio && (
            <p className="mt-3 max-w-reading whitespace-pre-wrap text-small leading-relaxed text-secondary">
              {profile.bio}
            </p>
          )}
          {profile.status === "muted" && (
            <p className="mt-2 text-caption text-faint">该用户当前处于禁言状态（仅可浏览）。</p>
          )}
        </div>
        <ProfileAdminEntry userId={profile.id} username={profile.username} />
      </header>

      {/* 内容分区 */}
      <PublicProfileTabs userId={profile.id} privacy={profile.privacy} />
    </div>
  );
}
