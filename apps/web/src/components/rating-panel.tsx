"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guidesApi, type RatingSummary } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { RatingStars } from "./rating-stars";

/**
 * 攻略评分面板（客户端组件）。
 * 数据：GET /guides/:slug/ratings；提交：PUT 同路径（幂等，需登录）。
 */

export function RatingPanel({
  slug,
  initial,
}: {
  slug: string;
  initial: RatingSummary;
}) {
  const [summary, setSummary] = useState<RatingSummary>(initial);
  const [loggedIn, setLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  const submit = (score: number) => {
    if (submitting) return;
    setSubmitting(true);
    setMsg("");
    guidesApi
      .rate(slug, score)
      .then((next) => {
        setSummary(next);
        setMsg(
          summary.myScore === null ? "评分成功，感谢反馈。" : "已更新你的评分。",
        );
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setMsg("登录已失效，请重新登录后再评分。");
        } else if (e instanceof ApiError && e.status === 429) {
          setMsg(`操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`);
        } else {
          setMsg("评分失败，请稍后重试。");
        }
      })
      .finally(() => setSubmitting(false));
  };

  const maxCount = Math.max(1, ...Object.values(summary.distribution));

  return (
    <section
      aria-labelledby="rating-panel"
      className="max-w-reading rounded-md border border-border-subtle bg-surface p-6"
    >
      <h2 id="rating-panel" className="font-serif text-h2 font-semibold">
        评分
      </h2>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        {/* 平均分 */}
        <div>
          <p className="font-serif text-[2.5rem] font-semibold leading-none text-amber">
            {summary.average.toFixed(1)}
          </p>
          <div className="mt-2">
            <RatingStars rating={summary.average} />
          </div>
          <p className="mt-1 text-caption text-faint">
            共 {summary.count} 人评分
          </p>
        </div>

        {/* 分布 */}
        <div className="min-w-48 flex-1 space-y-1.5" aria-label="评分分布">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[String(star)] ?? 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="w-6 text-right font-mono text-caption text-faint">
                  {star}★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-amber transition-[width] duration-slow"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 font-mono text-caption text-faint">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 我的评分 */}
      <div className="mt-6 border-t border-border-subtle pt-4">
        {loggedIn ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-small text-secondary">
              {summary.myScore === null
                ? "为这篇攻略评分："
                : `我的评分：${summary.myScore}★（点击可修改）`}
            </span>
            <span className="flex gap-1" role="radiogroup" aria-label="选择评分">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={summary.myScore === score}
                  aria-label={`${score} 星`}
                  disabled={submitting}
                  onClick={() => submit(score)}
                  className={`text-h3 transition-colors duration-fast disabled:opacity-40 ${
                    summary.myScore !== null && score <= summary.myScore
                      ? "text-amber"
                      : "text-faint hover:text-amber"
                  }`}
                >
                  ★
                </button>
              ))}
            </span>
            {msg && <span className="text-caption text-secondary">{msg}</span>}
          </div>
        ) : (
          <p className="text-small text-secondary">
            <Link href="/login" className="text-amber hover:underline">
              登录
            </Link>{" "}
            后即可为这篇攻略评分。
          </p>
        )}
      </div>
    </section>
  );
}
