"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import type { components } from "@/lib/schema";

/**
 * 签到与经验等级面板（契约 PR #75）。
 * - 等级 + 经验条：User.exp / nextLevelExp（满级 nextLevelExp=null）
 * - 签到：GET /users/me/checkin 状态，POST 签到（+10，连续 7 天额外 +30；重复 409）
 * - 经验记录：GET /users/me/exp-log（来源/数值/时间，分页）
 * 端点未上线（404）时整体降级为「即将上线」占位，不影响资料页其他功能。
 */

type CheckInStatus = components["schemas"]["CheckInStatus"];
type CheckInResult = components["schemas"]["CheckInResult"];
type ExpLogEntry = components["schemas"]["ExpLogEntry"];

const REASON_LABEL: Record<string, string> = {
  checkin: "每日签到",
  wiki: "创建 Wiki 词条",
  guide: "发布攻略",
  thread: "论坛发帖",
  reply: "论坛回复",
  comment: "发表评论",
  bookmark: "收藏内容",
  like: "点赞内容",
};

/** 等级曲线 100×n×(n-1)/2：当前等级的起始累计经验 */
function levelStartExp(level: number): number {
  return 50 * level * (level - 1);
}

const PER_PAGE = 10;

export function CheckinPanel({
  exp,
  level,
  nextLevelExp,
  onExpChange,
}: {
  exp?: number;
  level?: number;
  nextLevelExp?: number | null;
  onExpChange?: (exp: number, level: number, nextLevelExp: number | null) => void;
}) {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  const [log, setLog] = useState<ExpLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLog = useCallback((p: number) => {
    request<{ data: ExpLogEntry[]; pagination: { totalPages: number } }>(
      "/users/me/exp-log",
      { query: { page: p, perPage: PER_PAGE } },
    )
      .then((r) => {
        setLog(r.data);
        setTotalPages(Math.max(1, r.pagination.totalPages));
      })
      .catch(() => setLog([]));
  }, []);

  useEffect(() => {
    request<{ data: CheckInStatus }>("/users/me/checkin")
      .then((r) => setStatus(r.data))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setUnsupported(true);
      });
    loadLog(1);
  }, [loadLog]);

  // 后端端点尚未上线：静默占位
  if (unsupported) {
    return (
      <div className="mt-6 rounded-md border border-border-subtle bg-raised p-4">
        <p className="font-mono text-caption uppercase tracking-[0.3em] text-amber">
          签到与等级
        </p>
        <p className="mt-2 text-small text-faint">签到与经验等级功能即将上线。</p>
      </div>
    );
  }

  const curExp = exp ?? 0;
  const curLevel = level ?? 1;
  const start = levelStartExp(curLevel);
  const pct =
    nextLevelExp == null || nextLevelExp <= start
      ? nextLevelExp == null
        ? 100
        : 0
      : Math.min(100, Math.round(((curExp - start) / (nextLevelExp - start)) * 100));

  const checkIn = () => {
    if (checking || status?.today) return;
    setChecking(true);
    setToast("");
    request<{ data: CheckInResult }>("/users/me/checkin", { method: "POST" })
      .then((r) => {
        setStatus({ today: true, streak: r.data.streak, total: r.data.total });
        onExpChange?.(r.data.exp, r.data.level, r.data.nextLevelExp);
        setToast(
          r.data.gainedExp > 0
            ? `签到成功，经验 +${r.data.gainedExp}`
            : "签到成功，已满级经验不再增长",
        );
        loadLog(1);
        setPage(1);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) {
          setStatus((s) => (s ? { ...s, today: true } : s));
          setToast("今日已签到，明天再来吧。");
        } else {
          setToast("签到失败，请稍后重试。");
        }
      })
      .finally(() => setChecking(false));
  };

  return (
    <div className="mt-6 rounded-md border border-border-subtle bg-raised p-4">
      <p className="font-mono text-caption uppercase tracking-[0.3em] text-amber">
        签到与等级
      </p>

      {/* 等级 + 经验条 + 签到按钮 */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="rounded-sm border border-amber-soft px-2 py-0.5 font-mono text-small font-medium text-amber">
          Lv.{curLevel}
        </span>
        <div className="min-w-40 grow">
          <div
            role="progressbar"
            aria-valuenow={curExp}
            aria-valuemin={start}
            aria-valuemax={nextLevelExp ?? curExp}
            aria-label={`当前经验 ${curExp}${nextLevelExp != null ? `，下一级需 ${nextLevelExp}` : "，已满级"}`}
            className="h-2 overflow-hidden rounded-full bg-page"
          >
            <div
              className="h-full rounded-full bg-amber transition-all duration-normal"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-caption text-faint">
            {nextLevelExp != null
              ? `经验 ${curExp} / ${nextLevelExp}（距 Lv.${curLevel + 1} 还差 ${Math.max(0, nextLevelExp - curExp)}）`
              : `经验 ${curExp} · 已满级`}
          </p>
        </div>
        <button
          type="button"
          disabled={checking || status?.today === true}
          onClick={checkIn}
          className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
        >
          {status?.today ? "今日已签到" : checking ? "签到中…" : "每日签到"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-faint">
        {status && (
          <span>
            连续签到 {status.streak} 天 · 累计 {status.total} 天
          </span>
        )}
        {toast && (
          <span role="status" className="text-amber">
            {toast}
          </span>
        )}
      </div>

      {/* 经验记录 */}
      <div className="mt-4 border-t border-border-subtle pt-3">
        <p className="font-mono text-caption text-faint">经验记录</p>
        {log.length === 0 ? (
          <p className="mt-2 text-small text-faint">暂无经验记录。</p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle">
            {log.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 py-2">
                <span className="w-14 shrink-0 font-mono text-small font-medium text-amber">
                  +{e.amount}
                </span>
                <span className="min-w-0 grow truncate text-small text-secondary">
                  {REASON_LABEL[e.reason] ?? e.reason}
                </span>
                <time className="shrink-0 font-mono text-caption text-faint">
                  {new Date(e.createdAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <nav
            aria-label="经验记录分页"
            className="mt-2 flex items-center justify-end gap-2 text-caption"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                loadLog(p);
              }}
              className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              上一页
            </button>
            <span className="font-mono text-faint">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                loadLog(p);
              }}
              className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              下一页
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
