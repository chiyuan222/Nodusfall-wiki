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
 */

interface Me {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role?: string;
  createdAt?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  moderator: "版主",
  editor: "编辑",
  member: "成员",
  guest: "访客",
};

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
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 用户自传头像
          <img
            src={avatarUrl}
            alt={`${me.displayName} 的头像`}
            className="h-16 w-16 rounded-full border border-border-subtle object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-soft bg-raised font-serif text-h2 text-amber"
          >
            {(me.displayName || me.username).slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-primary">
            {me.displayName}
            {me.role && (
              <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption font-normal text-amber">
                {ROLE_LABEL[me.role.toLowerCase()] ?? me.role}
              </span>
            )}
          </p>
          <p className="mt-0.5 font-mono text-caption text-faint">
            @{me.username}
            {me.createdAt && (
              <> · 注册于 {new Date(me.createdAt).toLocaleDateString("zh-CN")}</>
            )}
          </p>
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
