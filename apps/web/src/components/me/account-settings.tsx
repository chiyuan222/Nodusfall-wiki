"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { clearSession, getAccessToken } from "@/lib/session";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useMe } from "@/lib/me";
import type { components } from "@/lib/schema";

type ProfilePrivacy = components["schemas"]["ProfilePrivacy"];

const PRIVACY_ITEMS: { key: keyof ProfilePrivacy; label: string; desc: string }[] = [
  { key: "showThreads", label: "公开我发布的主题", desc: "他人主页「主题」分区" },
  { key: "showComments", label: "公开我的评论", desc: "他人主页「评论」分区" },
  { key: "showBookmarks", label: "公开我的收藏", desc: "他人主页「收藏」分区" },
];

/** 主页可见性（契约 PR #141：GET/PATCH /users/me 的 privacy 字段） */
function PrivacySettings() {
  const { me } = useMe();
  const [privacy, setPrivacy] = useState<ProfilePrivacy | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // me 到位后初始化本地开关状态（后端缺省时默认全开）
  useEffect(() => {
    if (me && privacy === null) {
      setPrivacy(
        me.privacy ?? {
          showThreads: true,
          showComments: true,
          showBookmarks: true,
        },
      );
    }
  }, [me, privacy]);

  if (!me || !privacy) return null;

  const toggle = (key: keyof ProfilePrivacy, value: boolean) => {
    if (busy) return;
    const prev = privacy;
    setPrivacy({ ...prev, [key]: value });
    setBusy(true);
    setMsg("");
    request("/users/me", {
      method: "PATCH",
      body: { privacy: { [key]: value } },
    })
      .then(() => setMsg("主页可见性已更新。"))
      .catch(() => {
        setPrivacy(prev);
        setMsg("保存失败，请稍后重试。");
      })
      .finally(() => setBusy(false));
  };

  return (
    <section
      aria-labelledby="privacy"
      className="rounded-md border border-border-subtle bg-surface p-5"
    >
      <h2 id="privacy" className="mb-1 text-small font-semibold text-secondary">
        主页可见性
      </h2>
      <p className="mb-3 text-caption text-faint">
        控制他人访问你的公开主页时能看到哪些分区；关闭后对应栏目对外显示「未公开」。
      </p>
      <div className="space-y-2.5">
        {PRIVACY_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-sm border border-border-subtle bg-raised px-3 py-2.5"
          >
            <span>
              <span className="block text-small text-primary">{item.label}</span>
              <span className="block text-caption text-faint">{item.desc}</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber"
              checked={privacy[item.key]}
              disabled={busy}
              onChange={(e) => toggle(item.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
      {msg && (
        <p role="status" className="mt-2 text-caption text-secondary">
          {msg}
        </p>
      )}
    </section>
  );
}

/**
 * 账号设置（契约 PR #45）：
 * - 外观主题切换
 * - 软注销：DELETE /users/me（body {password}），内容保留并匿名化、会话全部失效；
 *   成功后清空本地会话并回首页
 */
export function AccountSettings() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  if (!loggedIn) return null;

  const doDelete = () => {
    if (busy || !password) return;
    setBusy(true);
    setMsg("");
    request<void>("/users/me", { method: "DELETE", body: { password } })
      .then(() => {
        clearSession();
        router.push("/");
        router.refresh();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 400 || e.status === 401)) {
          setMsg("密码不正确，注销未完成。");
        } else if (e instanceof ApiError && e.status === 429) {
          setMsg(`操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`);
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
        setBusy(false);
      });
  };

  return (
    <div className="space-y-6">
      {/* 外观 */}
      <section
        aria-labelledby="appearance"
        className="rounded-md border border-border-subtle bg-surface p-5"
      >
        <h2 className="mb-3 text-small font-semibold text-secondary">
          外观 · 美术主题
        </h2>
        <ThemeSwitcher />
      </section>

      {/* 主页可见性 */}
      <PrivacySettings />

      {/* 危险区：软注销 */}
      <section
        aria-labelledby="danger"
        className="rounded-md border border-danger/40 bg-surface p-5"
      >
        <h2 className="text-small font-semibold text-danger">注销账号</h2>
        <p className="mt-2 text-small leading-relaxed text-secondary">
          注销后账号立即失效且无法登录；你发布的条目、攻略与评论会保留，但作者显示为「已注销用户」。此操作不可撤销。
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-md border border-danger px-4 py-2 text-small text-danger transition-colors duration-fast hover:bg-danger hover:text-white"
          >
            我要注销账号
          </button>
        ) : (
          <div className="mt-4 max-w-sm space-y-3">
            <label className="block">
              <span className="mb-1 block text-caption text-faint">
                输入密码确认注销
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-danger"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || !password}
                onClick={doDelete}
                className="rounded-md bg-danger px-4 py-2 text-small font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "注销中…" : "确认注销"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setMsg("");
                }}
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:text-primary"
              >
                取消
              </button>
              {msg && (
                <span role="alert" className="text-caption text-danger">
                  {msg}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
