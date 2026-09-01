"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { clearSession, getAccessToken } from "@/lib/session";
import { ThemeSwitcher } from "@/components/theme-switcher";

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
