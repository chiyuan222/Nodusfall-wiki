"use client";

import { useState } from "react";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useMe, hasPermission } from "@/lib/me";

/**
 * 处置作者（禁言/封禁）按钮 + 弹窗（权限体系 v2，契约 PR #119/#121）。
 * - 需 manage_users；后端限制只能处置等级低于自己的账号，403 时提示无权处置
 * - 禁言默认 7 天（1–365 可选）；封禁默认永久（可选 1–365 天）
 * - PATCH /admin/users/{userId}：status + banReason + mutedUntil/banUntil
 */

interface Props {
  author: { id: string; displayName?: string; username?: string };
  /**  compact 用于列表行内 */
  compact?: boolean;
}

export function AuthorDiscipline({ author, compact = true }: Props) {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"mute" | "ban">("mute");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [permanent, setPermanent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!me || !hasPermission(me, "manage_users") || me.id === author.id) {
    return null;
  }

  const name = author.displayName || author.username || "该用户";

  const submit = () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    const d = Math.min(365, Math.max(1, Number(days) || (action === "mute" ? 7 : 365)));
    const until =
      action === "mute" || !permanent
        ? new Date(Date.now() + d * 86400_000).toISOString()
        : null;
    const body: Record<string, unknown> =
      action === "mute"
        ? { status: "muted", banReason: reason || "违反社区规范", mutedUntil: until }
        : { status: "banned", banReason: reason || "严重违反社区规范", banUntil: until };
    request<{ data: unknown }>(`/admin/users/${author.id}`, {
      method: "PATCH",
      body,
    })
      .then(() => {
        setMsg(action === "mute" ? "已禁言。" : "已封禁。");
        setTimeout(() => setOpen(false), 600);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403)
          setMsg("无权处置该账号（仅可处置等级低于自己的账号）。");
        else if (e instanceof ApiError)
          setMsg(`操作失败：${e.problem.detail ?? e.problem.title}`);
        else setMsg("无法连接后端。");
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMsg("");
        }}
        className={
          compact
            ? "rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-danger hover:text-danger"
            : "rounded-md border border-danger px-4 py-2 text-small text-danger hover:bg-danger hover:text-white"
        }
      >
        处置作者
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`处置 ${name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md space-y-4 rounded-md border border-border-subtle bg-surface p-6">
            <h3 className="font-serif text-h3 font-semibold">处置 {name}</h3>

            <div className="flex gap-2" role="radiogroup" aria-label="处置方式">
              {(
                [
                  ["mute", "禁言"],
                  ["ban", "封禁"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={action === v}
                  onClick={() => {
                    setAction(v);
                    setDays(v === "mute" ? "7" : "365");
                    setPermanent(v === "ban");
                  }}
                  className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
                    action === v
                      ? "bg-danger text-white"
                      : "border border-border-subtle text-secondary hover:border-danger hover:text-danger"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block font-mono text-caption text-faint">
                原因（将展示给该用户）
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder={action === "mute" ? "如：刷屏 / 引战" : "如：恶意破坏内容"}
                className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
              />
            </label>

            <div className="flex items-end gap-3">
              <label className="block">
                <span className="mb-1 block font-mono text-caption text-faint">
                  时长（天，1–365）
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  disabled={action === "ban" && permanent}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-28 rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft disabled:opacity-40"
                />
              </label>
              {action === "ban" && (
                <label className="flex items-center gap-2 pb-2 text-small text-secondary">
                  <input
                    type="checkbox"
                    className="accent-amber"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                  />
                  永久封禁
                </label>
              )}
            </div>

            {msg && (
              <p role="alert" className="text-caption text-danger">
                {msg}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="rounded-md bg-danger px-4 py-2 text-small font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "执行中…" : action === "mute" ? "确认禁言" : "确认封禁"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
