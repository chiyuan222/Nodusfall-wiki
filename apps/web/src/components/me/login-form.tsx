"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { featurePhoneEnabled } from "@/lib/feature-flags";

/**
 * 登录表单：POST /auth/sessions（grantType=password）。
 * 账号栏自动识别：匹配 ^1[3-9]\d{9}$ 按手机号登录，否则按邮箱登录（契约 PR #45）。
 * 手机号登录暂封闭（featurePhoneEnabled=false）：识别到手机号时提示改用邮箱。
 * 成功后跳用户中心 /me。
 */

const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const id = account.trim();
    let credential: { email: string } | { phone: string };
    if (PHONE_RE.test(id)) {
      if (!featurePhoneEnabled) {
        setMsg("手机号登录暂未开放，请使用邮箱登录。");
        return;
      }
      credential = { phone: id };
    } else if (EMAIL_RE.test(id)) {
      credential = { email: id };
    } else {
      setMsg("请输入有效的邮箱或中国大陆手机号。");
      return;
    }
    setSubmitting(true);
    setMsg("");
    login(credential, password)
      .then(() => {
        router.push("/me");
        router.refresh();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setMsg("邮箱/手机号或密码不正确；已注销账号无法登录。");
        } else if (err instanceof ApiError && err.status === 429) {
          setMsg(`尝试太频繁，请 ${err.retryAfter ?? "稍后"} 秒后再试。`);
        } else if (err instanceof ApiError && err.status === 400) {
          setMsg("请输入有效的账号与密码。");
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
        setSubmitting(false);
      });
  };

  return (
    <form className="mt-8 space-y-4" aria-label="登录表单" onSubmit={submit}>
      <div>
        <label htmlFor="account" className="mb-1 block text-small text-secondary">
          {featurePhoneEnabled ? "邮箱或手机号" : "邮箱"}
        </label>
        <input
          id="account"
          name="account"
          autoComplete="username"
          required
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder={featurePhoneEnabled ? "自动识别邮箱 / 手机号" : "注册时使用的邮箱"}
          className="w-full rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary placeholder:text-faint focus:border-amber-soft"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-small text-secondary">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary placeholder:text-faint focus:border-amber-soft"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !account.trim() || !password}
        className="w-full rounded-md bg-amber px-4 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "登录中…" : "登录"}
      </button>
      {msg && (
        <p role="alert" className="text-center text-caption text-danger">
          {msg}
        </p>
      )}
      <p className="text-center text-caption text-faint">
        还没有账号？
        <Link href="/register" className="text-amber hover:underline">
          立即注册
        </Link>
      </p>
    </form>
  );
}
