"use client";

import { useEffect, useRef, useState } from "react";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import type { MeUser } from "@/lib/me";

/**
 * 手机号绑定 / 换绑（契约 PR #82）。
 * - 未绑定：入口「绑定手机号」；已绑定：脱敏手机号 +「换绑」
 * - 弹窗：新手机号 + POST /auth/sms-codes 验证码（60s 倒计时）+ 确认
 * - POST /users/me/phone：409 = 手机号被其他账号占用；成功后后端自动将用户组置为 verified
 * - 端点未上线（404）时不渲染入口，不干扰资料页
 */

const PHONE_RE = /^1[3-9]\d{9}$/;

export function PhoneBind({
  phoneMasked,
  onBound,
}: {
  phoneMasked?: string | null;
  onBound: (user: MeUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (unsupported) return null;

  const openDialog = () => {
    setPhone("");
    setCode("");
    setMsg("");
    setOpen(true);
  };

  const sendCode = () => {
    if (sending || countdown > 0) return;
    if (!PHONE_RE.test(phone.trim())) {
      setMsg("请输入有效的中国大陆手机号。");
      return;
    }
    setSending(true);
    setMsg("");
    request<void>("/auth/sms-codes", {
      method: "POST",
      auth: false,
      body: { phone: phone.trim() },
    })
      .then(() => {
        setCountdown(60);
        setMsg("验证码已发送，10 分钟内有效。");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 429) {
          setMsg(`发送太频繁，请 ${err.retryAfter ?? 60} 秒后再试。`);
          setCountdown(Number(err.retryAfter) || 60);
        } else if (err instanceof ApiError && err.status === 404) {
          setUnsupported(true);
          setOpen(false);
        } else {
          setMsg("发送失败，请稍后重试。");
        }
      })
      .finally(() => setSending(false));
  };

  const submit = () => {
    if (submitting) return;
    if (!PHONE_RE.test(phone.trim())) return setMsg("请输入有效的中国大陆手机号。");
    if (!/^\d{6}$/.test(code.trim())) return setMsg("请输入 6 位数字验证码。");
    setSubmitting(true);
    setMsg("");
    request<{ data: MeUser }>("/users/me/phone", {
      method: "POST",
      body: { phone: phone.trim(), smsCode: code.trim() },
    })
      .then((r) => {
        onBound(r.data);
        setOpen(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 409) {
          setMsg("该手机号已被其他账号绑定。");
        } else if (err instanceof ApiError && err.status === 400) {
          setMsg(err.problem.detail ?? "验证码不正确或已过期。");
        } else if (err instanceof ApiError && err.status === 404) {
          setUnsupported(true);
          setOpen(false);
        } else {
          setMsg("绑定失败，请稍后重试。");
        }
      })
      .finally(() => setSubmitting(false));
  };

  const inputCls =
    "w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="font-mono text-caption text-amber hover:underline"
      >
        {phoneMasked ? "换绑" : "绑定手机号"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={phoneMasked ? "换绑手机号" : "绑定手机号"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-page/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm space-y-4 rounded-md border border-border-subtle bg-surface p-5 shadow-card">
            <p className="text-body font-semibold text-primary">
              {phoneMasked ? "换绑手机号" : "绑定手机号"}
            </p>
            {phoneMasked && (
              <p className="text-caption text-faint">
                当前绑定 {phoneMasked}，换绑只需验证新手机号。
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-small text-secondary">新手机号</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="中国大陆 11 位手机号"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-small text-secondary">短信验证码</span>
              <span className="flex gap-2">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6 位数字"
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={sending || countdown > 0}
                  onClick={sendCode}
                  className="w-28 shrink-0 rounded-md border border-amber-soft px-2 text-caption text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg disabled:opacity-40"
                >
                  {countdown > 0 ? `${countdown}s 后重发` : sending ? "发送中…" : "发送验证码"}
                </button>
              </span>
            </label>
            {msg && (
              <p role="alert" className="text-caption text-danger">
                {msg}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft"
              >
                取消
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="rounded-md bg-amber px-4 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "提交中…" : "确认绑定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
