"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";

/**
 * Wiki / 攻略内容管理列表（客户端组件，/admin/wiki 与 /admin/guides 共用）。
 * - 门禁：wiki 允许 admin/editor，guides 仅 admin
 * - 列表：GET /wiki/pages 或 /guides，支持状态筛选（草稿/已发布/已归档）
 * - 操作：编辑（跳转编辑器）、发布/归档切换（PATCH status）
 */

interface Me {
  id: string;
  role?: string;
}

interface Item {
  slug: string;
  title: string;
  status?: string;
  author: { displayName: string };
  updatedAt: string;
  categorySlug?: string;
  rating?: number;
  ratingCount?: number;
}

type StatusFilter = "" | "draft" | "published" | "archived";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

function normStatus(s?: string): string {
  return s?.toLowerCase() ?? "draft";
}

function describeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 403) return "权限不足。";
    return e.problem.detail ?? e.problem.title;
  }
  return fallback;
}

export function AdminContentList({ kind }: { kind: "wiki" | "guide" }) {
  const isWiki = kind === "wiki";
  const listPath = isWiki ? "/wiki/pages" : "/guides";
  const itemPath = (slug: string) =>
    isWiki ? `/wiki/pages/${slug}` : `/guides/${slug}`;
  const editPath = (slug: string) =>
    isWiki ? `/wiki/${slug}/edit` : `/guides/${slug}/edit`;
  const viewPath = (slug: string) =>
    isWiki ? `/wiki/${slug}` : `/guides/${slug}`;

  const [phase, setPhase] = useState<"loading" | "forbidden" | "ready">(
    "loading",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // 角色门禁
  useEffect(() => {
    if (!getAccessToken()) {
      setPhase("forbidden");
      return;
    }
    request<{ data: Me }>("/users/me")
      .then((r) => {
        const role = r.data.role?.toLowerCase() ?? "";
        const ok = isWiki
          ? role === "admin" || role === "editor"
          : role === "admin";
        setPhase(ok ? "ready" : "forbidden");
      })
      .catch(() => setPhase("forbidden"));
  }, [isWiki]);

  const load = useCallback(
    (statusFilter: StatusFilter) => {
      setLoading(true);
      setMsg("");
      request<ListResult<Item>>(listPath, {
        // 不传 sort：后端对 /wiki/pages 的查询参数做严格校验，暂不支持 sort（会 400）
        query: {
          perPage: 50,
          status: statusFilter || undefined,
        },
      })
        .then((r) => setItems(r.data))
        .catch((e: unknown) => setMsg(describeError(e, "列表加载失败。")))
        .finally(() => setLoading(false));
    },
    [listPath],
  );

  useEffect(() => {
    if (phase === "ready") load(status);
  }, [phase, status, load]);

  const setItemStatus = (slug: string, next: "published" | "archived") => {
    if (busySlug) return;
    setBusySlug(slug);
    setMsg("");
    request<{ data: Item }>(itemPath(slug), {
      method: "PATCH",
      body: { status: next },
    })
      .then(() => load(status))
      .catch((e: unknown) => setMsg(describeError(e, "状态更新失败。")))
      .finally(() => setBusySlug(null));
  };

  if (phase === "loading") {
    return <p className="py-8 text-center text-small text-faint">载入中…</p>;
  }

  if (phase === "forbidden") {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">
          {isWiki
            ? "Wiki 内容管理仅管理员与编辑可用。"
            : "攻略内容管理仅管理员可用。"}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具行 */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="状态筛选"
          className="flex rounded-md border border-border-subtle"
        >
          {(
            [
              ["", "全部"],
              ["draft", "草稿"],
              ["published", "已发布"],
              ["archived", "已归档"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              onClick={() => setStatus(key)}
              className={`px-3 py-1.5 text-small transition-colors duration-fast ${
                status === key
                  ? "bg-amber text-amber-fg"
                  : "text-secondary hover:text-amber"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <Link
          href={isWiki ? "/wiki/new" : "/editor/guide/new"}
          className="rounded-md border border-amber-soft px-4 py-1.5 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
        >
          ＋ {isWiki ? "新建条目" : "撰写攻略"}
        </Link>
      </div>

      {msg && (
        <p role="alert" className="text-caption text-secondary">
          {msg}
        </p>
      )}

      {/* 列表 */}
      {loading ? (
        <p className="py-8 text-center text-small text-faint">载入中…</p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-subtle px-6 py-10 text-center text-small text-faint">
          该状态下暂无内容。
        </p>
      ) : (
        <ol className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-surface">
          {items.map((item) => {
            const st = normStatus(item.status);
            return (
              <li
                key={item.slug}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
              >
                <span
                  className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-caption ${
                    st === "published"
                      ? "border-amber-soft text-amber"
                      : st === "archived"
                        ? "border-border-subtle text-faint line-through"
                        : "border-border-subtle text-secondary"
                  }`}
                >
                  {STATUS_LABEL[st] ?? item.status}
                </span>
                <Link
                  href={viewPath(item.slug)}
                  className="min-w-0 truncate text-small font-medium text-primary hover:text-amber"
                >
                  {item.title}
                </Link>
                <span className="font-mono text-caption text-faint">
                  {item.author.displayName} ·{" "}
                  {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                  {!isWiki && item.ratingCount
                    ? ` · ★${(item.rating ?? 0).toFixed(1)}(${item.ratingCount})`
                    : ""}
                  {isWiki && item.categorySlug
                    ? ` · ${item.categorySlug}`
                    : ""}
                </span>
                <span className="grow" />
                <Link
                  href={editPath(item.slug)}
                  className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                >
                  编辑
                </Link>
                {st !== "published" ? (
                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => setItemStatus(item.slug, "published")}
                    className="rounded-sm border border-amber-soft px-2.5 py-1 text-caption text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg disabled:opacity-40"
                  >
                    发布
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => setItemStatus(item.slug, "archived")}
                    className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-danger hover:text-danger disabled:opacity-40"
                  >
                    归档
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
