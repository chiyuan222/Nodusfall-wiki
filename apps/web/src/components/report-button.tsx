"use client";

import { useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";

/**
 * 内容举报（契约 PR #90）：POST /reports。
 * 挂载点：论坛主题/每楼回复、评论、Wiki 词条、攻略详情。
 * 弹窗 = 原因单选 + 补充说明（≤500 字）。
 * 409 → 已举报过；404 → 提示功能即将上线（后端未部署时优雅降级）。
 */

export type ReportTargetType =
  | "forumThread"
  | "forumPost"
  | "comment"
  | "wikiPage"
  | "guide";

const REASONS: [string, string][] = [
  ["spam", "广告/垃圾信息"],
  ["porn", "色情低俗"],
  ["politics", "政治敏感"],
  ["violence", "暴力血腥"],
  ["illegal", "违法违规"],
  ["other", "其他"],
];

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const loggedIn = typeof window !== "undefined" && !!getAccessToken();

  const submit = () => {
    if (submitting || !reason) return;
    setSubmitting(true);
    setMsg("");
    request("/reports", {
      method: "POST",
      body: {
        targetType,
        targetId,
        reason,
        detail: detail.trim() || undefined,
      },
    })
      .then(() => {
        setDone(true);
        setMsg("举报已提交，感谢反馈。");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) {
          setDone(true);
          setMsg("你已举报过该内容，请等待处理。");
        } else if (e instanceof ApiError && e.status === 404) {
          setMsg("举报功能即将上线。");
        } else if (e instanceof ApiError && e.status === 401) {
          setMsg("登录已失效，请重新登录。");
        } else {
          setMsg("提交失败，请稍后重试。");
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMsg("");
          if (!done) setReason("");
        }}
        className="rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-faint transition-colors duration-fast hover:border-amber-soft hover:text-amber"
      >
        举报
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="举报内容"
          className="fixed inset-0 z-50 flex items-center justify-center bg-page/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm space-y-4 rounded-md border border-border-subtle bg-surface p-5 shadow-card">
            <p className="text-body font-semibold text-primary">举报内容</p>

            {!loggedIn ? (
              <p className="text-small text-secondary">
                登录后才能举报。
                <Link href="/login" className="text-amber hover:underline">
                  去登录
                </Link>
              </p>
            ) : done ? (
              <p role="status" className="text-small text-amber">
                {msg}
              </p>
            ) : (
              <>
                <fieldset>
                  <legend className="mb-2 text-small text-secondary">
                    举报原因
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {REASONS.map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-small transition-colors duration-fast ${
                          reason === value
                            ? "border-amber-soft text-amber"
                            : "border-border-subtle text-secondary hover:border-amber-soft"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`report-reason-${targetId}`}
                          value={value}
                          checked={reason === value}
                          onChange={() => setReason(value)}
                          className="accent-amber"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="mb-1 block text-small text-secondary">
                    补充说明（可选，≤500 字）
                  </span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="补充具体情况，便于管理员核实…"
                    className="w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
                  />
                </label>
                {msg && (
                  <p role="alert" className="text-caption text-danger">
                    {msg}
                  </p>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft"
              >
                关闭
              </button>
              {loggedIn && !done && (
                <button
                  type="button"
                  disabled={submitting || !reason}
                  onClick={submit}
                  className="rounded-md bg-amber px-4 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? "提交中…" : "提交举报"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
