"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";

/** 登录表单：POST /auth/sessions（grantType=password），成功后回首页 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMsg("");
    login(email.trim(), password)
      .then(() => {
        router.push("/");
        router.refresh();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setMsg("邮箱或密码不正确。");
        } else if (err instanceof ApiError && err.status === 429) {
          setMsg(`尝试太频繁，请 ${err.retryAfter ?? "稍后"} 秒后再试。`);
        } else if (err instanceof ApiError && err.status === 400) {
          setMsg("请输入有效的邮箱与密码。");
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
        setSubmitting(false);
      });
  };

  return (
    <form className="mt-8 space-y-4" aria-label="登录表单" onSubmit={submit}>
      <div>
        <label htmlFor="email" className="mb-1 block text-small text-secondary">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        disabled={submitting || !email.trim() || !password}
        className="w-full rounded-md bg-amber px-4 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "登录中…" : "登录"}
      </button>
      {msg && (
        <p role="alert" className="text-center text-caption text-danger">
          {msg}
        </p>
      )}
    </form>
  );
}
