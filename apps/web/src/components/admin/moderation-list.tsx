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
  targetUrl,
  type ModerationTargetType,
} from "@/lib/moderation";

/**
 * 内容巡查（契约 PR #90）：GET /admin/moderation/content。
 * 五类 UGC 统一列表（标题/摘要/作者/状态/时间），「查看」跳转详情；
 * 「下架」复用现有删除端点（二次确认）：
 * forumThread→DELETE /forum/threads/{id}，forumPost→/forum/posts/{id}，
 * comment→/comments/{id}，wikiPage→/wiki/pages/{slug}，guide→/guides/{slug}
 * 权限：owner 或 manage_content。端点未上线（404）时占位。
 */

type Item = components["schemas"]["ModerationContentItem"];

const TYPES: (ModerationTargetType | "")[] = [
  "",
  "forumThread",
  "forumPost",
  "comment",
  "wikiPage",
  "guide",
];

const PER_PAGE = 20;

function deletePath(type: string, id: string): string {
  switch (type) {
    case "forumThread":
      return `/forum/threads/${id}`;
    case "forumPost":
      return `/forum/posts/${id}`;
    case "comment":
      return `/comments/${id}`;
    case "wikiPage":
      return `/wiki/pages/${id}`;
    default:
      return `/guides/${id}`;
  }
}

export function ModerationList() {
  const { me, pending } = useMe();
  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState<ModerationTargetType | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [busyId, setBusyId] = useState("");

  // 内容巡查：任一分区板块权限即可进入（权限体系 v2 对照表）
  const allowed =
    !!me &&
    (isAdminRole(me.role) ||
      (
        [
          "manage_all_boards",
          "manage_wiki_board",
          "manage_guide_board",
          "manage_forum_board",
          "manage_video_board",
        ] as const
      ).some((k) => hasPermission(me, k)));

  const load = useCallback(
    (p: number, t: string) => {
      setLoading(true);
      setErr("");
      request<{ data: Item[]; pagination: { totalPages: number; total: number } }>(
        "/admin/moderation/content",
        { query: { page: p, perPage: PER_PAGE, type: t || undefined } },
      )
        .then((r) => {
          setItems(r.data);
          setTotalPages(Math.max(1, r.pagination.totalPages));
          setTotal(r.pagination.total);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) setUnsupported(true);
          else if (e instanceof ApiError && e.status === 403)
            setErr("当前账号无内容巡查权限。");
          else setErr("巡查列表加载失败，请稍后重试。");
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (allowed) load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次加载
  }, [allowed]);

  const switchType = (t: ModerationTargetType | "") => {
    setType(t);
    setPage(1);
    load(1, t);
  };

  const takedown = (item: Item) => {
    if (busyId) return;
    const label = TARGET_TYPE_LABEL[item.type as ModerationTargetType] ?? item.type;
    if (
      !window.confirm(
        `确认下架该${label}？\n\n${item.title || item.excerpt.slice(0, 60)}\n\n下架后对外不可见，操作将计入审计。`,
      )
    )
      return;
    setBusyId(item.id);
    request<void>(deletePath(item.type, item.id), { method: "DELETE" })
      .then(() => load(page, type))
      .catch((e: unknown) =>
        setErr(
          e instanceof ApiError
            ? (e.problem.detail ?? "下架失败，请稍后重试。")
            : "下架失败，请稍后重试。",
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
        当前账号无内容巡查权限（需站长或 manage_content 开关）。
      </p>
    );
  }
  if (unsupported) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        内容巡查功能即将上线。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* 类型选项卡 */}
      <div
        role="tablist"
        aria-label="内容类型"
        className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {TYPES.map((t) => (
          <button
            key={t || "all"}
            type="button"
            role="tab"
            aria-selected={type === t}
            onClick={() => switchType(t)}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              type === t
                ? "bg-amber font-medium text-amber-fg"
                : "text-secondary hover:text-amber"
            }`}
          >
            {t ? TARGET_TYPE_LABEL[t] : "全部"}
          </button>
        ))}
      </div>

      {err && (
        <p role="alert" className="rounded-md border border-danger/40 bg-surface px-4 py-2 text-small text-danger">
          {err}
        </p>
      )}

      {/* 巡查列表 */}
      <ul className="space-y-3">
        {items.map((item) => {
          const url = targetUrl(item.type, item.id);
          return (
            <li
              key={`${item.type}-${item.id}`}
              className="rounded-md border border-border-subtle bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-caption">
                <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-amber">
                  {TARGET_TYPE_LABEL[item.type as ModerationTargetType] ?? item.type}
                </span>
                <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-faint">
                  {item.status}
                </span>
                <time className="font-mono text-faint">
                  {new Date(item.createdAt).toLocaleString("zh-CN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                <span className="grow" />
                {url && (
                  <Link
                    href={url}
                    target="_blank"
                    className="text-amber hover:underline"
                  >
                    查看 ↗
                  </Link>
                )}
                {item.status !== "deleted" && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => takedown(item)}
                    className="rounded-sm border border-border-subtle px-2 py-0.5 text-danger transition-colors duration-fast hover:border-danger disabled:opacity-40"
                  >
                    下架
                  </button>
                )}
              </div>
              {item.title && (
                <p className="mt-2 text-small font-medium text-primary">
                  {item.title}
                </p>
              )}
              <p className="mt-1 line-clamp-2 text-small text-secondary">
                {item.excerpt}
              </p>
              <p className="mt-2 flex items-center gap-2 text-caption text-faint">
                作者：
                {item.author ? (
                  <>
                    <span className="text-secondary">{item.author.displayName}</span>
                    <SiteIdMark siteId={item.author.siteId} />
                  </>
                ) : (
                  "已注销用户"
                )}
              </p>
            </li>
          );
        })}
        {!loading && items.length === 0 && (
          <li className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-small text-faint">
            暂无内容。
          </li>
        )}
        {loading && (
          <li className="px-4 py-8 text-center text-small text-faint">载入中…</li>
        )}
      </ul>

      {/* 分页 */}
      <nav aria-label="巡查分页" className="flex items-center justify-end gap-2 text-caption">
        <span className="font-mono text-faint">共 {total} 条</span>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            load(p, type);
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
            load(p, type);
          }}
          className="rounded-sm border border-border-subtle px-2 py-1 text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
        >
          下一页
        </button>
      </nav>
    </div>
  );
}
