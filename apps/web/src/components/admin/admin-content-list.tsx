"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { isAdminRole, hasPermission, type MeUser } from "@/lib/me";

/**
 * Wiki / 攻略内容管理列表（客户端组件，/admin/wiki 与 /admin/guides 共用）。
 * - 门禁（权限体系 v2 PR #119）：wiki 允许 admin/owner、wiki 小编/版主或
 *   manage_wiki_board；guides 对应 guide 小编/版主或 manage_guide_board
 * - 列表：GET /wiki/pages 或 /guides，支持状态筛选（草稿/已发布/已归档）
 * - 操作：编辑（跳转编辑器）、发布/归档切换（PATCH status）、精华标记（PATCH featured）
 * - 精华状态：Summary 无 featuredAt 字段（契约），载入后按详情接口并发补齐；
 *   首页「精华推荐」按 featuredAt desc 取用（GET /home/digest）
 */

type Me = MeUser;

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
  const itemPath = useCallback(
    (slug: string) =>
      isWiki ? `/wiki/pages/${slug}` : `/guides/${slug}`,
    [isWiki],
  );
  const editPath = (slug: string) =>
    isWiki ? `/wiki/${slug}/edit` : `/guides/${slug}/edit`;
  const viewPath = (slug: string) =>
    isWiki ? `/wiki/${slug}` : `/guides/${slug}`;

  const [phase, setPhase] = useState<"loading" | "forbidden" | "ready">(
    "loading",
  );
  const [items, setItems] = useState<Item[]>([]);
  /** slug → featuredAt（null = 非精华）；详情并发补齐，Summary 不含该字段 */
  const [featuredMap, setFeaturedMap] = useState<Record<string, string | null>>(
    {},
  );
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
        // 权限体系 v2：管理可用性走 hasPermission（effective permissions 已由后端回填）
        const ok = isWiki
          ? isAdminRole(role) ||
            role === "wiki_editor" ||
            role === "wiki_moderator" ||
            hasPermission(r.data, "manage_wiki_board")
          : isAdminRole(role) ||
            role === "guide_editor" ||
            role === "guide_moderator" ||
            hasPermission(r.data, "manage_guide_board");
        setPhase(ok ? "ready" : "forbidden");
      })
      .catch(() => setPhase("forbidden"));
  }, [isWiki]);

  const load = useCallback(
    (statusFilter: StatusFilter) => {
      setLoading(true);
      setMsg("");
      request<ListResult<Item>>(listPath, {
        // sort 契约（openapi.yaml）：wiki 支持 updatedAt/createdAt/title，攻略支持 rating/updatedAt/createdAt
        // 管理列表统一按「最近更新」排序（后端 DTO 已放行，2026-09-01 联调实测 200）
        query: {
          perPage: 50,
          sort: "updatedAt",
          status: statusFilter || undefined,
        },
      })
        .then(async (r) => {
          setItems(r.data);
          // 并发补精华状态（详情接口含 featuredAt）；单条失败按 null 处理
          const entries = await Promise.all(
            r.data.map((it) =>
              request<{ data: { featuredAt?: string | null } }>(
                itemPath(it.slug),
              )
                .then((d) => [it.slug, d.data.featuredAt ?? null] as const)
                .catch(() => [it.slug, null] as const),
            ),
          );
          setFeaturedMap(Object.fromEntries(entries));
        })
        .catch((e: unknown) => setMsg(describeError(e, "列表加载失败。")))
        .finally(() => setLoading(false));
    },
    [listPath, itemPath],
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

  /** 精华标记切换：featured=true → featuredAt=now（首页精华栏按此倒序取） */
  const toggleFeatured = (slug: string, next: boolean) => {
    if (busySlug) return;
    setBusySlug(slug);
    setMsg("");
    request<{ data: { featuredAt?: string | null } }>(itemPath(slug), {
      method: "PATCH",
      body: { featured: next },
    })
      .then((r) =>
        setFeaturedMap((m) => ({ ...m, [slug]: r.data.featuredAt ?? null })),
      )
      .catch((e: unknown) => setMsg(describeError(e, "精华标记失败。")))
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

      <p className="text-caption text-faint">
        ★ 精华内容进入首页「精华推荐」栏（按标记时间倒序，接口最多返回 12 条）；建议只对已发布内容打精华。
      </p>

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
            const isFeatured = Boolean(featuredMap[item.slug]);
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
                {isFeatured && (
                  <span className="shrink-0 rounded-sm border border-amber-soft bg-amber/10 px-1.5 py-0.5 font-mono text-caption text-amber">
                    ★ 精华
                  </span>
                )}
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
                <button
                  type="button"
                  disabled={busySlug === item.slug}
                  aria-pressed={isFeatured}
                  title={
                    isFeatured
                      ? "取消精华：从首页「精华推荐」移除"
                      : "设为精华：进入首页「精华推荐」栏"
                  }
                  onClick={() => toggleFeatured(item.slug, !isFeatured)}
                  className={`rounded-sm border px-2.5 py-1 text-caption transition-colors duration-fast disabled:opacity-40 ${
                    isFeatured
                      ? "border-amber-soft bg-amber/10 text-amber hover:bg-transparent"
                      : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
                  }`}
                >
                  {isFeatured ? "★ 撤精华" : "☆ 设精华"}
                </button>
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
