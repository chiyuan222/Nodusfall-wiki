"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { isAdminRole, hasPermission, type MeUser } from "@/lib/me";

/**
 * 板块与分类管理（客户端组件，/admin/taxonomy）。
 *
 * 契约（openapi.yaml，Issue #27 冻结版）：
 * - 读：GET /wiki/categories、GET /forum/boards（公开接口）
 * - 写：POST/PATCH/DELETE /admin/wiki/categories[/{slug}]、
 *       POST/PATCH/DELETE /admin/forum/boards[/{slug}]（仅 ADMIN）
 * - PATCH 不允许改 slug；删除非空分类/板块返回 409；slug 冲突返回 409
 */

interface TaxItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
  /** 仅论坛板块有 */
  threadCount?: number;
}

type Kind = "wiki" | "guide" | "forum";

const KIND_CONFIG: Record<
  Kind,
  {
    label: string;
    unit: string;
    listPath: string;
    adminPath: string;
    /** 权限体系 v2：该分区板块管理权限 key */
    perm: "manage_wiki_board" | "manage_guide_board" | "manage_forum_board";
  }
> = {
  wiki: {
    label: "Wiki 分类",
    unit: "分类",
    listPath: "/wiki/categories",
    adminPath: "/admin/wiki/categories",
    perm: "manage_wiki_board",
  },
  guide: {
    label: "攻略分类",
    unit: "分类",
    listPath: "/guides/categories",
    adminPath: "/admin/guides/categories",
    perm: "manage_guide_board",
  },
  forum: {
    label: "论坛板块",
    unit: "板块",
    listPath: "/forum/boards",
    adminPath: "/admin/forum/boards",
    perm: "manage_forum_board",
  },
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface DraftFields {
  slug: string;
  name: string;
  description: string;
  sortOrder: string;
}

const emptyDraft = (sortOrder: number): DraftFields => ({
  slug: "",
  name: "",
  description: "",
  sortOrder: String(sortOrder),
});

function describeError(e: unknown, unit: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 403) return "权限不足（需要管理员）。";
    if (e.status === 409)
      return `操作冲突：slug 已存在，或该${unit}下还有内容（非空禁止删除）。`;
    if (e.status === 404) return `${unit}不存在或已被删除，请刷新列表。`;
    return e.problem.detail ?? e.problem.title;
  }
  return "无法连接后端，操作未生效。";
}

export function TaxonomyManager({
  fixedKind,
  hideTabs = false,
}: {
  /** 固定管理某一类（嵌入分区板块管理页时隐藏内部切换） */
  fixedKind?: Kind;
  hideTabs?: boolean;
}) {
  const [phase, setPhase] = useState<"loading" | "forbidden" | "ready">(
    "loading",
  );
  const [tab, setTab] = useState<Kind>(fixedKind ?? "wiki");
  const [items, setItems] = useState<TaxItem[]>([]);
  const [listMsg, setListMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftFields>(emptyDraft(10));
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields | null>(null);
  const [rowMsg, setRowMsg] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const cfg = KIND_CONFIG[tab];

  // 角色门禁：admin/owner、manage_all_boards，或当前分区的板块管理权限
  useEffect(() => {
    if (!getAccessToken()) {
      setPhase("forbidden");
      return;
    }
    request<{ data: MeUser }>("/users/me")
      .then((r) => {
        const m = r.data;
        const ok =
          isAdminRole(m.role) ||
          hasPermission(m, "manage_all_boards") ||
          hasPermission(m, KIND_CONFIG[fixedKind ?? tab].perm);
        setPhase(ok ? "ready" : "forbidden");
      })
      .catch(() => setPhase("forbidden"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 门禁只需校验一次
  }, []);

  const load = useCallback(
    (kind: Kind) => {
      setLoading(true);
      setListMsg("");
      request<{ data: TaxItem[] }>(KIND_CONFIG[kind].listPath, { auth: false })
        .then((r) =>
          setItems(
            [...r.data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          ),
        )
        .catch(() => setListMsg("列表加载失败，后端可能未在线。"))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (phase === "ready") load(tab);
  }, [phase, tab, load]);

  const switchTab = (kind: Kind) => {
    setTab(kind);
    setEditSlug(null);
    setCreateMsg("");
    setRowMsg("");
  };

  /* ---------- 新建 ---------- */
  const create = () => {
    if (creating) return;
    setCreateMsg("");
    if (!SLUG_PATTERN.test(draft.slug)) {
      setCreateMsg("slug 只能由小写字母、数字和连字符组成（如 lore-world）。");
      return;
    }
    if (!draft.name.trim()) {
      setCreateMsg("请填写名称。");
      return;
    }
    setCreating(true);
    request<{ data: TaxItem }>(cfg.adminPath, {
      method: "POST",
      body: {
        slug: draft.slug.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        sortOrder: Number(draft.sortOrder) || 0,
      },
    })
      .then(() => {
        setDraft(emptyDraft(10));
        setCreateMsg(`已创建${cfg.unit}。`);
        load(tab);
      })
      .catch((e: unknown) => setCreateMsg(describeError(e, cfg.unit)))
      .finally(() => setCreating(false));
  };

  /* ---------- 编辑 ---------- */
  const startEdit = (item: TaxItem) => {
    setEditSlug(item.slug);
    setEditDraft({
      slug: item.slug,
      name: item.name,
      description: item.description ?? "",
      sortOrder: String(item.sortOrder ?? 0),
    });
    setRowMsg("");
  };

  const saveEdit = () => {
    if (!editDraft || !editSlug || busySlug) return;
    if (!editDraft.name.trim()) {
      setRowMsg("名称不能为空。");
      return;
    }
    setBusySlug(editSlug);
    setRowMsg("");
    request<{ data: TaxItem }>(`${cfg.adminPath}/${editSlug}`, {
      method: "PATCH",
      body: {
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || undefined,
        sortOrder: Number(editDraft.sortOrder) || 0,
      },
    })
      .then(() => {
        setEditSlug(null);
        setEditDraft(null);
        load(tab);
      })
      .catch((e: unknown) => setRowMsg(describeError(e, cfg.unit)))
      .finally(() => setBusySlug(null));
  };

  /* ---------- 删除 ---------- */
  const remove = (item: TaxItem) => {
    if (busySlug) return;
    const warning =
      item.threadCount && item.threadCount > 0
        ? `板块「${item.name}」下还有 ${item.threadCount} 个主题，后端会拒绝删除（409）。仍要尝试吗？`
        : `确定删除${cfg.unit}「${item.name}」吗？此操作不可撤销。`;
    if (!window.confirm(warning)) return;
    setBusySlug(item.slug);
    setRowMsg("");
    request<void>(`${cfg.adminPath}/${item.slug}`, { method: "DELETE" })
      .then(() => load(tab))
      .catch((e: unknown) => setRowMsg(describeError(e, cfg.unit)))
      .finally(() => setBusySlug(null));
  };

  /* ---------- 渲染 ---------- */
  if (phase === "loading") {
    return <p className="py-16 text-center text-small text-faint">载入中…</p>;
  }
  if (phase === "forbidden") {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">
          当前账号无此分区的板块管理权限。请先登录具备权限的账号。
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft";
  const labelCls = "mb-1 block font-mono text-caption text-faint";
  const btnCls =
    "rounded-md border border-border-subtle px-3 py-1.5 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber disabled:opacity-40";

  return (
    <div>
      {/* Tab 切换（fixedKind 嵌入模式下隐藏） */}
      {!hideTabs && (
        <div className="flex gap-2" role="tablist" aria-label="管理对象">
          {(Object.keys(KIND_CONFIG) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => switchTab(k)}
              className={`rounded-md px-5 py-2 text-small transition-colors duration-fast ${
                tab === k
                  ? "bg-amber font-medium text-amber-fg"
                  : "border border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
              }`}
            >
              {KIND_CONFIG[k].label}
            </button>
          ))}
        </div>
      )}

      {/* 现有列表 */}
      <div className="mt-5 overflow-hidden rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">
            {listMsg || `暂无${cfg.unit}。`}
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((item) => {
              const editing = editSlug === item.slug && editDraft;
              return (
                <li key={item.id} className="px-5 py-4">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block">
                          <span className={labelCls}>名称</span>
                          <input
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, name: e.target.value })
                            }
                            maxLength={64}
                            className={inputCls}
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>
                            slug（创建后不可修改）
                          </span>
                          <input
                            value={editDraft.slug}
                            disabled
                            className={`${inputCls} opacity-50`}
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>排序值（越小越靠前）</span>
                          <input
                            value={editDraft.sortOrder}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                sortOrder: e.target.value,
                              })
                            }
                            inputMode="numeric"
                            className={inputCls}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className={labelCls}>描述（可留空）</span>
                        <input
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              description: e.target.value,
                            })
                          }
                          className={inputCls}
                        />
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={busySlug === item.slug}
                          className="rounded-md bg-amber px-4 py-1.5 text-caption font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
                        >
                          {busySlug === item.slug ? "保存中…" : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditSlug(null);
                            setEditDraft(null);
                          }}
                          className={btnCls}
                        >
                          取消
                        </button>
                        {rowMsg && (
                          <span className="text-caption text-danger">{rowMsg}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-body font-medium text-primary">
                        {item.name}
                      </span>
                      <span className="font-mono text-caption text-faint">
                        {item.slug}
                      </span>
                      <span className="font-mono text-caption text-faint">
                        排序 {item.sortOrder ?? 0}
                      </span>
                      {item.threadCount !== undefined && (
                        <span className="font-mono text-caption text-faint">
                          {item.threadCount} 主题
                        </span>
                      )}
                      {item.description && (
                        <span className="w-full text-small text-secondary">
                          {item.description}
                        </span>
                      )}
                      <span className="grow" />
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className={btnCls}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busySlug === item.slug}
                        className={`${btnCls} hover:border-danger hover:text-danger`}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {rowMsg && !editSlug && (
        <p className="mt-2 text-caption text-danger">{rowMsg}</p>
      )}

      {/* 新建表单 */}
      <div className="mt-6 rounded-md border border-border-subtle bg-surface p-5">
        <h2 className="font-mono text-caption uppercase tracking-[0.3em] text-amber">
          新建{cfg.unit}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className={labelCls}>slug（唯一标识，如 lore-world）</span>
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="小写字母/数字/连字符"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>名称</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={64}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>排序值（越小越靠前）</span>
            <input
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              inputMode="numeric"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>描述（可留空）</span>
            <input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
          >
            {creating ? "创建中…" : `创建${cfg.unit}`}
          </button>
          {createMsg && (
            <span className="text-caption text-secondary">{createMsg}</span>
          )}
        </div>
        <p className="mt-3 text-caption text-faint">
          删除规则：{cfg.unit}下还有内容时后端会拒绝删除（409）；slug 创建后不可修改，只能改名、改描述、调排序。
        </p>
      </div>
    </div>
  );
}
