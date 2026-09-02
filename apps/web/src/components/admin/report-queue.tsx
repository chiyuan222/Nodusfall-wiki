"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import type { components } from "@/lib/schema";
import { useMe, isAdminRole, hasPermission } from "@/lib/me";
import { SiteIdMark } from "@/components/user-marks";
import {
  TARGET_TYPE_LABEL,
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  targetUrl,
  type ModerationTargetType,
} from "@/lib/moderation";

/**
 * 举报处理（契约 PR #90）：GET /admin/reports + PATCH /admin/reports/{id}。
 * 默认 PENDING 待处理；处理（RESOLVED）/驳回（REJECTED）+ 可选备注；行内跳转内容。
 * 权限：owner 或 manage_content。端点未上线（404）时占位。
 */

type Report = components["schemas"]["Report"];

const PER_PAGE = 20;

export function ReportQueue() {
  const { me, pending } = useMe();
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("PENDING");
  const [targetType, setTargetType] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [busyId, setBusyId] = useState("");

  const allowed =
    !!me && (isAdminRole(me.role) || hasPermission(me, "manage_content"));

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      setErr("");
      request<{ data: Report[]; pagination: { totalPages: number; total: number } }>(
        "/admin/reports",
        {
          query: {
            page: p,
            perPage: PER_PAGE,
            status: status || undefined,
            targetType: targetType || undefined,
          },
        },
      )
        .then((r) => {
          setReports(r.data);
          setTotalPages(Math.max(1, r.pagination.totalPages));
          setTotal(r.pagination.total);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) setUnsupported(true);
          else if (e instanceof ApiError && e.status === 403)
            setErr("当前账号无举报处理权限。");
          else setErr("举报列表加载失败，请稍后重试。");
        })
        .finally(() => setLoading(false));
    },
    [status, targetType],
  );

  useEffect(() => {
    if (allowed) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次加载，筛选由「查询」触发
  }, [allowed]);

  const handle = (report: Report, next: "RESOLVED" | "REJECTED") => {
    if (busyId) return;
    const note = window.prompt(
      next === "RESOLVED" ? "处理备注（可选）：" : "驳回备注（可选）：",
    );
    if (note === null) return; // 取消
    setBusyId(report.id);
    request<{ data: Report }>(`/admin/reports/${report.id}`, {
      method: "PATCH",
      body: { status: next, note: note.trim() || undefined },
    })
      .then(() => load(page))
      .catch((e: unknown) =>
        setErr(
          e instanceof ApiError
            ? (e.problem.detail ?? "操作失败，请稍后重试。")
            : "操作失败，请稍后重试。",
        ),
      )
      .finally(() => setBusyId(""));
  };

  if (pending) return null;
  if (!me) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 管理员账号。
      </p>
    );
  }
  if (!allowed) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        当前账号无举报处理权限（需站长或 manage_content 开关）。
      </p>
    );
  }
  if (unsupported) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        举报处理功能即将上线。
      </p>
    );
  }

  const inputCls =
    "rounded-md border border-border-subtle bg-raised px-3 py-1.5 text-small text-primary focus:border-amber-soft focus:outline-none";

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <select
          aria-label="按状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputCls}
        >
          <option value="PENDING">待处理</option>
          <option value="RESOLVED">已处理</option>
          <option value="REJECTED">已驳回</option>
          <option value="">全部状态</option>
        </select>
        <select
          aria-label="按内容类型筛选"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className={inputCls}
        >
          <option value="">全部类型</option>
          {Object.entries(TARGET_TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
        >
          查询
        </button>
      </form>

      {err && (
        <p role="alert" className="rounded-md border border-danger/40 bg-surface px-4 py-2 text-small text-danger">
          {err}
        </p>
      )}

      {/* 举报列表 */}
      <ul className="space-y-3">
        {reports.map((r) => {
          const url = targetUrl(r.targetType, r.targetId);
          return (
            <li
              key={r.id}
              className="rounded-md border border-border-subtle bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-caption">
                <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-amber">
                  {TARGET_TYPE_LABEL[r.targetType as ModerationTargetType] ?? r.targetType}
                </span>
                <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-secondary">
                  {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                </span>
                <span
                  className={`rounded-sm border px-1.5 py-0.5 font-mono ${
                    r.status === "PENDING"
                      ? "border-amber-soft text-amber"
                      : "border-border-subtle text-faint"
                  }`}
                >
                  {REPORT_STATUS_LABEL[r.status] ?? r.status}
                </span>
                <time className="font-mono text-faint">
                  {new Date(r.createdAt).toLocaleString("zh-CN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-secondary">
                <span className="flex items-center gap-2">
                  举报人：
                  {r.reporter ? (
                    <>
                      {r.reporter.displayName}
                      <SiteIdMark siteId={r.reporter.siteId} />
                    </>
                  ) : (
                    <span className="text-faint">已注销用户</span>
                  )}
                </span>
                <span className="font-mono text-caption text-faint">
                  目标：{r.targetId}
                </span>
                {url && (
                  <Link
                    href={url}
                    target="_blank"
                    className="text-amber hover:underline"
                  >
                    查看内容 ↗
                  </Link>
                )}
              </div>
              {r.detail && (
                <p className="mt-2 rounded-sm bg-raised px-3 py-2 text-small text-secondary">
                  {r.detail}
                </p>
              )}
              {r.note && (
                <p className="mt-2 text-caption text-faint">处理备注：{r.note}</p>
              )}
              {r.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => handle(r, "RESOLVED")}
                    className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                  >
                    处理（下架/警告等）
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => handle(r, "REJECTED")}
                    className="rounded-md border border-border-subtle px-4 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber disabled:opacity-40"
                  >
                    驳回
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {!loading && reports.length === 0 && (
          <li className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-small text-faint">
            暂无{status === "PENDING" ? "待处理" : ""}举报。
          </li>
        )}
        {loading && (
          <li className="px-4 py-8 text-center text-small text-faint">载入中…</li>
        )}
      </ul>

      {/* 分页 */}
      <nav aria-label="举报分页" className="flex items-center justify-end gap-2 text-caption">
        <span className="font-mono text-faint">共 {total} 条</span>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            load(p);
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
          disabled={page >= totalPages || loading}
          onClick={() => {
            const p = page + 1;
            setPage(p);
            load(p);
          }}
          className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
        >
          下一页
        </button>
      </nav>
    </div>
  );
}
