"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import type { components } from "@/lib/schema";
import { useMe } from "@/lib/me";
import { SiteIdMark } from "@/components/user-marks";

/**
 * 管理审计日志（契约 PR #83，仅站长 owner 可见）。
 * GET /admin/audit-logs：分页 + 筛选（action / actorId / from / to）。
 * actor 为 null（操作者已注销）时显示 actorName 快照。
 * 端点未上线（404）时显示占位；非 owner 显示无权限提示。
 */

type AuditLog = components["schemas"]["AuditLog"];

/** 动作类型下拉分组（契约枚举） */
const ACTION_GROUPS: { label: string; actions: [string, string][] }[] = [
  {
    label: "站点与页面",
    actions: [
      ["site.sections.update", "分区开关调整"],
      ["site.floating.update", "漂浮窗配置"],
      ["cms.page.update", "页面内容更新"],
      ["announcement.create", "发布公告"],
    ],
  },
  {
    label: "用户管理",
    actions: [["user.update", "用户信息/权限变更"]],
  },
  {
    label: "板块与分类",
    actions: [
      ["wiki.category.create", "新建 Wiki 分类"],
      ["wiki.category.update", "修改 Wiki 分类"],
      ["wiki.category.delete", "删除 Wiki 分类"],
      ["forum.board.create", "新建论坛板块"],
      ["forum.board.update", "修改论坛板块"],
      ["forum.board.delete", "删除论坛板块"],
    ],
  },
  {
    label: "视频",
    actions: [
      ["video.create", "添加视频"],
      ["video.update", "修改视频"],
      ["video.delete", "删除视频"],
    ],
  },
  {
    label: "内容管理",
    actions: [
      ["wiki.page.update", "Wiki 词条管理变更"],
      ["wiki.page.delete", "删除 Wiki 词条"],
      ["guide.update", "攻略管理变更"],
      ["guide.delete", "删除攻略"],
      ["forum.thread.update", "主题管理变更"],
      ["forum.thread.delete", "删除主题"],
      ["forum.post.update", "回复管理变更"],
      ["forum.post.delete", "删除回复"],
      ["comment.delete", "删除评论"],
    ],
  },
];

const ACTION_LABEL: Record<string, string> = Object.fromEntries(
  ACTION_GROUPS.flatMap((g) => g.actions),
);

const PER_PAGE = 20;

export function AuditLogViewer() {
  const { me, pending } = useMe();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [unsupported, setUnsupported] = useState(false);

  const isOwner = me?.role?.toLowerCase() === "owner";

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      setErr("");
      request<{ data: AuditLog[]; pagination: { totalPages: number; total: number } }>(
        "/admin/audit-logs",
        {
          query: {
            page: p,
            perPage: PER_PAGE,
            action: action || undefined,
            actorId: actorId.trim() || undefined,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          },
        },
      )
        .then((r) => {
          setLogs(r.data);
          setTotalPages(Math.max(1, r.pagination.totalPages));
          setTotal(r.pagination.total);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) setUnsupported(true);
          else if (e instanceof ApiError && e.status === 403)
            setErr("仅站长可查看操作日志。");
          else setErr("日志加载失败，请稍后重试。");
        })
        .finally(() => setLoading(false));
    },
    [action, actorId, from, to],
  );

  useEffect(() => {
    if (isOwner) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次进入加载，筛选由「查询」按钮触发
  }, [isOwner]);

  if (pending) return null;
  if (!me) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 站长账号。
      </p>
    );
  }
  if (!isOwner) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        操作日志仅站长可查看（403）。
      </p>
    );
  }
  if (unsupported) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        操作日志功能即将上线。
      </p>
    );
  }

  const inputCls =
    "rounded-md border border-border-subtle bg-raised px-3 py-1.5 text-small text-primary focus:border-amber-soft focus:outline-none";

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <select
          aria-label="按动作类型筛选"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className={inputCls}
        >
          <option value="">全部动作</option>
          {ACTION_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.actions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          aria-label="按操作者 UUID 筛选"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          placeholder="操作者 UUID"
          className={`${inputCls} w-56`}
        />
        <input
          type="date"
          aria-label="开始日期"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={inputCls}
        />
        <span className="text-faint">—</span>
        <input
          type="date"
          aria-label="结束日期"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputCls}
        />
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

      {/* 日志表格 */}
      <div className="overflow-x-auto rounded-md border border-border-subtle bg-surface">
        <table className="w-full min-w-[640px] text-left text-small">
          <thead>
            <tr className="border-b border-border-subtle font-mono text-caption text-faint">
              <th className="px-4 py-2.5 font-normal">时间</th>
              <th className="px-4 py-2.5 font-normal">操作者</th>
              <th className="px-4 py-2.5 font-normal">动作</th>
              <th className="px-4 py-2.5 font-normal">描述</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-caption text-faint">
                  {new Date(log.createdAt).toLocaleString("zh-CN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-2.5 text-secondary">
                  <span className="flex flex-wrap items-center gap-2">
                    {log.actorName}
                    {log.actor ? (
                      <SiteIdMark siteId={log.actor.siteId} />
                    ) : (
                      <span className="font-mono text-caption text-faint">（已注销）</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-secondary">
                  {log.detail ?? `${log.action}${log.targetId ? ` → ${log.targetId}` : ""}`}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-faint">
                  暂无日志记录。
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-faint">
                  载入中…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <nav aria-label="日志分页" className="flex items-center justify-end gap-2 text-caption">
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
