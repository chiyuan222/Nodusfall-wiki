"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  feedbackApi,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";

/**
 * 意见反馈（契约 PR #108 A 组）：
 * - 提交表单：分类下拉 + 正文（2–1000 字）；当日限 10 条，429 提示「今日提交次数已用完」
 * - 我的反馈：分类徽标 + 内容 + 状态徽标（待处理/已回复/已关闭）+ 站长回复与时间
 * - 提交成功后自动切到「我的反馈」列表
 */

const CATEGORY_META: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "问题反馈" },
  { value: "suggestion", label: "功能建议" },
  { value: "appeal", label: "内容申诉" },
  { value: "other", label: "其他" },
];

const STATUS_META: Record<FeedbackStatus, { label: string; cls: string }> = {
  PENDING: {
    label: "待处理",
    cls: "border-amber-soft/60 text-amber",
  },
  REPLIED: {
    label: "已回复",
    cls: "border-success/60 text-success",
  },
  CLOSED: {
    label: "已关闭",
    cls: "border-border-subtle text-faint",
  },
};

const categoryLabel = (c: FeedbackCategory) =>
  CATEGORY_META.find((m) => m.value === c)?.label ?? c;

const inputCls =
  "w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none";

export function MyFeedback() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [view, setView] = useState<"form" | "list">("form");

  // 提交表单
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [formErr, setFormErr] = useState("");

  // 我的反馈列表
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState("");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  const loadList = useCallback((p: number) => {
    setLoading(true);
    setListErr("");
    feedbackApi
      .listMine(p, 10)
      .then((r) => {
        setItems(r.data);
        setHasMore(r.pagination.hasMore);
      })
      .catch(() => setListErr("反馈记录加载失败，后端可能未在线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loggedIn && view === "list") loadList(page);
  }, [loggedIn, view, page, loadList]);

  if (!loggedIn) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 后提交反馈。
      </p>
    );
  }

  const submit = () => {
    const text = content.trim();
    if (submitting) return;
    if (text.length < 2) {
      setFormErr("反馈内容至少 2 个字。");
      return;
    }
    setSubmitting(true);
    setFormErr("");
    setFormMsg("");
    feedbackApi
      .create(category, text)
      .then(() => {
        setContent("");
        setFormMsg("");
        setPage(1);
        setView("list"); // 成功后跳转「我的反馈」
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 429) {
          setFormErr("今日提交次数已用完。");
        } else if (e instanceof ApiError && e.status === 400) {
          setFormErr(e.problem.detail ?? "内容不完整或格式不正确。");
        } else {
          setFormErr("提交失败，请稍后重试。");
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-4">
      {/* 子页签：提交反馈 / 我的反馈 */}
      <div
        role="tablist"
        aria-label="意见反馈"
        className="flex gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {(
          [
            { key: "form", label: "提交反馈" },
            { key: "list", label: "我的反馈" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={view === t.key}
            onClick={() => setView(t.key)}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              view === t.key
                ? "bg-raised font-medium text-primary"
                : "text-secondary hover:text-amber"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "form" ? (
        <div className="space-y-4 rounded-md border border-border-subtle bg-surface p-5">
          <label className="block">
            <span className="mb-1 block text-caption text-faint">反馈分类</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className={`${inputCls} w-auto`}
            >
              {CATEGORY_META.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-caption text-faint">
              反馈内容（{content.length}/1000）
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="描述你遇到的问题或建议，站长会在后台处理并回复…"
              className="w-full resize-y rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
            />
          </label>
          {formErr && (
            <p role="alert" className="text-caption text-danger">
              {formErr}
            </p>
          )}
          {formMsg && (
            <p role="status" className="text-caption text-success">
              {formMsg}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={submitting || content.trim().length < 2}
              onClick={submit}
              className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? "提交中…" : "提交反馈"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border-subtle bg-surface">
          {loading ? (
            <p className="p-6 text-center text-small text-faint">载入中…</p>
          ) : listErr ? (
            <p role="alert" className="p-6 text-center text-small text-faint">
              {listErr}
            </p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-small text-faint">
              还没有提交过反馈。
            </p>
          ) : (
            <ol className="divide-y divide-border-subtle">
              {items.map((f) => {
                const st = STATUS_META[f.status] ?? STATUS_META.PENDING;
                return (
                  <li key={f.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-secondary">
                        {categoryLabel(f.category)}
                      </span>
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 font-mono text-caption ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      <time className="font-mono text-caption text-faint">
                        {new Date(f.createdAt).toLocaleString("zh-CN")}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-small text-primary">
                      {f.content}
                    </p>
                    {f.replyText && (
                      <div className="mt-3 rounded-md border border-amber-soft/40 bg-raised px-4 py-3">
                        <p className="flex items-center gap-2 text-caption text-amber">
                          站长回复
                          {f.repliedAt && (
                            <time className="font-mono text-faint">
                              {new Date(f.repliedAt).toLocaleString("zh-CN")}
                            </time>
                          )}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-small text-secondary">
                          {f.replyText}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
              >
                ← 上一页
              </button>
              <span className="font-mono text-caption text-faint">
                第 {page} 页
              </span>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
              >
                下一页 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
