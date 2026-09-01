"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api-client";
import { saveSession } from "@/lib/session";
import { ApiError } from "@/lib/errors";

/**
 * 注册表单：POST /users（契约 PR #45）。
 * - 邮箱注册：{ username, password, email, emailCode }，验证码 POST /auth/email-codes（60s 倒计时）
 * - 手机号注册：{ username, password, phone }（^1[3-9]\d{9}$，短信验证后续接入）
 * - 需勾选社区协议；成功后自动登录并跳 /me
 */

type Tab = "email" | "phone";

const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 60s 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(
      () => setCountdown((c) => (c <= 1 ? 0 : c - 1)),
      1000,
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- 只需在启动/归零时重建

  const sendCode = () => {
    if (sending || countdown > 0) return;
    if (!EMAIL_RE.test(email.trim())) {
      setMsg("请输入有效的邮箱地址。");
      return;
    }
    setSending(true);
    setMsg("");
    request<void>("/auth/email-codes", {
      method: "POST",
      auth: false,
      body: { email: email.trim() },
    })
      .then(() => {
        setCountdown(60);
        setMsg("验证码已发送，10 分钟内有效。");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 429) {
          setMsg(`发送太频繁，请 ${err.retryAfter ?? 60} 秒后再试。`);
          setCountdown(Number(err.retryAfter) || 60);
        } else if (err instanceof ApiError && err.status === 400) {
          setMsg("邮箱格式不正确。");
        } else {
          setMsg("发送失败，请稍后重试。");
        }
      })
      .finally(() => setSending(false));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setMsg("");

    if (username.trim().length < 2) return setMsg("用户名至少 2 个字符。");
    if (password.length < 8) return setMsg("密码至少 8 位。");
    if (password !== confirm) return setMsg("两次输入的密码不一致。");
    if (!agreed) return setMsg("请先阅读并勾选社区协议。");

    const body: Record<string, string> = {
      username: username.trim(),
      password,
    };
    if (tab === "email") {
      if (!EMAIL_RE.test(email.trim())) return setMsg("请输入有效的邮箱地址。");
      if (!/^\d{6}$/.test(emailCode.trim()))
        return setMsg("请输入 6 位数字验证码。");
      body.email = email.trim();
      body.emailCode = emailCode.trim();
    } else {
      if (!PHONE_RE.test(phone.trim()))
        return setMsg("请输入有效的中国大陆手机号。");
      body.phone = phone.trim();
    }

    setSubmitting(true);
    request<{ data: { id: string } }>("/users", {
      method: "POST",
      auth: false,
      body,
    })
      .then(() =>
        // 注册成功后自动登录
        request("/auth/sessions", {
          method: "POST",
          auth: false,
          body:
            tab === "email"
              ? { grantType: "password", email: body.email, password }
              : { grantType: "password", phone: body.phone, password },
        }),
      )
      .then((r) => {
        const d = (r as { data: { accessToken: string; refreshToken: string; sessionId: string; expiresIn: number } }).data;
        saveSession(d);
        router.push("/me");
        router.refresh();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 409) {
          setMsg(err.problem.detail ?? "用户名或邮箱/手机号已被注册。");
        } else if (err instanceof ApiError && err.status === 400) {
          setMsg(err.problem.detail ?? "信息不完整或格式不正确。");
        } else if (err instanceof ApiError && err.status === 429) {
          setMsg(`操作太频繁，请 ${err.retryAfter ?? "稍后"} 秒后再试。`);
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
        setSubmitting(false);
      });
  };

  const inputCls =
    "w-full rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary placeholder:text-faint focus:border-amber-soft";
  const labelCls = "mb-1 block text-small text-secondary";

  return (
    <form className="mt-8 space-y-4" aria-label="注册表单" onSubmit={submit}>
      {/* 注册方式切换 */}
      <div
        role="tablist"
        aria-label="注册方式"
        className="grid grid-cols-2 rounded-md border border-border-subtle"
      >
        {(
          [
            ["email", "邮箱注册"],
            ["phone", "手机号注册"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setMsg("");
            }}
            className={`px-3 py-2 text-small transition-colors duration-fast ${
              tab === key
                ? "bg-amber font-medium text-amber-fg"
                : "text-secondary hover:text-amber"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="reg-username" className={labelCls}>
          用户名
        </label>
        <input
          id="reg-username"
          name="username"
          autoComplete="username"
          required
          minLength={2}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="2–32 个字符，注册后可改昵称"
          className={inputCls}
        />
      </div>

      {tab === "email" ? (
        <>
          <div>
            <label htmlFor="reg-email" className={labelCls}>
              邮箱
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="reg-code" className={labelCls}>
              邮箱验证码
            </label>
            <div className="flex gap-2">
              <input
                id="reg-code"
                name="emailCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="6 位数字"
                className={inputCls}
              />
              <button
                type="button"
                disabled={sending || countdown > 0}
                onClick={sendCode}
                className="w-32 shrink-0 rounded-md border border-amber-soft px-3 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg disabled:opacity-40"
              >
                {countdown > 0
                  ? `${countdown}s 后重发`
                  : sending
                    ? "发送中…"
                    : "发送验证码"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="reg-phone" className={labelCls}>
            手机号
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="中国大陆 11 位手机号"
            className={inputCls}
          />
          <p className="mt-1 text-caption text-faint">
            短信验证将在后续接入，当前为格式校验。
          </p>
        </div>
      )}

      <div>
        <label htmlFor="reg-password" className={labelCls}>
          密码
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="reg-confirm" className={labelCls}>
          确认密码
        </label>
        <input
          id="reg-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
      </div>

      <label className="flex items-start gap-2 text-small text-secondary">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 accent-amber"
        />
        <span>
          我已阅读并同意
          <span className="text-amber">《社区协议》</span>：本站为《源初之结》玩家非官方社区，不发布侵权与违规内容。
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting || !agreed}
        className="w-full rounded-md bg-amber px-4 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "注册中…" : "注册并登录"}
      </button>

      {msg && (
        <p role="alert" className="text-center text-caption text-danger">
          {msg}
        </p>
      )}

      <p className="text-center text-caption text-faint">
        已有账号？
        <Link href="/login" className="text-amber hover:underline">
          直接登录
        </Link>
      </p>
    </form>
  );
}
