"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { logout } from "@/lib/api-client";

/**
 * 用户中心资料面板（客户端组件）。
 * 读：GET /users/me；写：PATCH /users/me（displayName / avatarUrl / bio）。
 * 头像走 POST /uploads 直传后回填 url。
 * 契约 PR #51：展示用户组/等级；管理入口按 role + permissions 开关显示。
 */

import { isAdminRole, hasPermission, type MeUser } from "@/lib/me";
import { roleLabel } from "@/lib/roles";
import { UserGroupBadge, SiteIdMark } from "@/components/user-marks";
import { CheckinPanel } from "@/components/me/checkin-panel";
import { Avatar } from "@/components/avatar";
import { PhoneBind } from "@/components/me/phone-bind";
import { featurePhoneEnabled } from "@/lib/feature-flags";

type Me = MeUser;

export function ProfilePanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    request<{ data: Me }>("/users/me")
      .then((r) => {
        setMe(r.data);
        setDisplayName(r.data.displayName ?? "");
        setBio(r.data.bio ?? "");
        setAvatarUrl(r.data.avatarUrl ?? "");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) setLoggedIn(false);
        else setMsg("资料加载失败，请稍后重试。");
      });
  }, []);

  const uploadAvatar = async (file: File) => {
    const token = getAccessToken();
    if (!token) return;
    setUploading(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        setMsg(`头像上传失败（HTTP ${res.status}）。`);
        return;
      }
      const json = (await res.json()) as { data?: { url?: string } };
      const url = json.data?.url ?? "";
      if (!url) {
        setMsg("上传响应缺少 url 字段。");
        return;
      }
      setAvatarUrl(url);
      setDirty(true);
      setMsg("头像已上传，记得点「保存资料」。");
    } catch {
      setMsg("无法连接后端，上传失败。");
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    if (saving) return;
    setSaving(true);
    setMsg("");
    request<{ data: Me }>("/users/me", {
      method: "PATCH",
      body: {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      },
    })
      .then((r) => {
        setMe(r.data);
        setDirty(false);
        setMsg("资料已保存。");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setMsg("登录已失效，请重新登录。");
        } else if (e instanceof ApiError) {
          setMsg(`保存失败：${e.problem.detail ?? e.problem.title}`);
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
      })
      .finally(() => setSaving(false));
  };

  if (loggedIn === null) {
    return <p className="py-8 text-center text-small text-faint">载入中…</p>;
  }

  if (!loggedIn) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">登录后可管理个人资料。</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }

  if (!me) {
    return <p className="py-8 text-center text-small text-faint">正在读取资料…</p>;
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface p-6">
      {/* 资料卡 */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar url={avatarUrl} name={me.displayName || me.username} size="lg" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-primary">
            {me.displayName}
            {me.role && (
              <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption font-normal text-amber">
                {roleLabel(me.role)}
              </span>
            )}
            <UserGroupBadge group={me.group} level={me.level} />
          </p>
          <p className="mt-0.5 font-mono text-caption text-faint">
            @{me.username}
            {me.siteId != null && (
              <>
                {" · "}
                <SiteIdMark siteId={me.siteId} />
              </>
            )}
            {me.createdAt && (
              <> · 注册于 {new Date(me.createdAt).toLocaleDateString("zh-CN")}</>
            )}
          </p>
          {(me.emailMasked || (featurePhoneEnabled && me.phoneMasked)) && (
            <p className="mt-0.5 font-mono text-caption text-faint">
              {me.emailMasked && <>邮箱 {me.emailMasked}</>}
              {me.emailMasked && featurePhoneEnabled && me.phoneMasked && <> · </>}
              {featurePhoneEnabled && me.phoneMasked && <>手机 {me.phoneMasked}</>}
            </p>
          )}
          {featurePhoneEnabled && (
            <p className="mt-0.5">
              <PhoneBind
                phoneMasked={me.phoneMasked}
                onBound={(u) => {
                  setMe(u);
                  setMsg("手机号绑定成功，已完成手机认证，可评论/发帖。");
                }}
              />
            </p>
          )}
        </div>
        <span className="grow" />
        <button
          type="button"
          onClick={() => void logout().then(() => window.location.reload())}
          className="rounded-md border border-border-subtle px-4 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-danger hover:text-danger"
        >
          退出登录
        </button>
      </div>

      {/* 签到与经验等级（契约 PR #75）：签到后同步刷新资料卡等级徽章 */}
      <CheckinPanel
        exp={me.exp}
        level={me.level}
        nextLevelExp={me.nextLevelExp}
        onExpChange={(exp, level, nextLevelExp) =>
          setMe((prev) => (prev ? { ...prev, exp, level, nextLevelExp } : prev))
        }
      />

      {/* 管理入口（管理员/站长；按 manage_users / manage_content 开关细化显示） */}
      {(hasPermission(me, "manage_content") ||
        hasPermission(me, "manage_all_boards") ||
        hasPermission(me, "manage_users") ||
        hasPermission(me, "manage_reports")) && (
        <div className="mt-6 rounded-md border border-amber-soft bg-raised p-4">
          <p className="font-mono text-caption uppercase tracking-[0.3em] text-amber">
            站点管理
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {/* 权限体系 v2 第二波：后台入口收敛为 7 项；分区内容管理入口在各分区页内 */}
            {hasPermission(me, "manage_content") && (
              <>
                <Link
                  href="/admin/home"
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                >
                  首页内容管理
                </Link>
                <Link
                  href="/admin/world"
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                >
                  总览页内容管理
                </Link>
                <Link
                  href="/admin/site"
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                >
                  站点设置
                </Link>
                <Link
                  href="/admin/stats"
                  className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                >
                  站点统计
                </Link>
              </>
            )}
            {hasPermission(me, "manage_all_boards") && (
              <Link
                href="/admin/boards"
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
              >
                板块管理
              </Link>
            )}
            {hasPermission(me, "manage_users") && (
              <Link
                href="/admin/users"
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
              >
                用户与权限管理
              </Link>
            )}
            {hasPermission(me, "manage_reports") && (
              <Link
                href="/admin/reports"
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
              >
                举报处理
              </Link>
            )}
            {/* 仅站长 */}
            {me.role?.toLowerCase() === "owner" && (
              <>
                <Link
                  href="/admin/feedback"
                  className="rounded-md border border-amber-soft px-4 py-2 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
                >
                  意见反馈（仅站长）
                </Link>
                <Link
                  href="/admin/audit-logs"
                  className="rounded-md border border-amber-soft px-4 py-2 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
                >
                  操作日志（仅站长）
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* 编辑表单 */}
      <div className="mt-6 space-y-4 border-t border-border-subtle pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-caption text-faint">昵称</span>
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setDirty(true);
              }}
              maxLength={32}
              className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft"
            />
          </label>
          <div>
            <span className="mb-1 block font-mono text-caption text-faint">头像</span>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-border-subtle px-3 py-2 text-small text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
              >
                {uploading ? "上传中…" : "上传头像"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl("");
                    setDirty(true);
                  }}
                  className="text-caption text-faint hover:text-danger"
                >
                  移除
                </button>
              )}
            </div>
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">
            个人简介（可留空）
          </span>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setDirty(true);
            }}
            rows={3}
            maxLength={500}
            placeholder="向其他织者介绍一下自己…"
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-md bg-amber px-6 py-2 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "保存中…" : "保存资料"}
          </button>
          {msg && <span className="text-caption text-secondary">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
