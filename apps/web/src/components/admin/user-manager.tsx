"use client";

import { useCallback, useEffect, useState } from "react";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useMe, isAdminRole, type MeUser } from "@/lib/me";
import { UserGroupBadge, UserStatusMark } from "@/components/user-marks";
import { Avatar } from "@/components/avatar";
import type { components } from "@/lib/schema";

/**
 * 用户与权限管理（/admin/users，契约 PR #51）。
 * - 列表：GET /admin/users（q/group/role/status/level 筛选 + 分页）
 * - 详情：GET /admin/users/{userId}
 * - 修改：PATCH /admin/users/{userId}（组/等级/封禁解禁禁言/权限开关；role 与 permissions 仅 owner（可为任意用户分配/配置））
 * 需 manage_users 开关（admin/owner 默认具备）。
 */

type AdminUser = components["schemas"]["AdminUser"];
type Permission = NonNullable<MeUser["permissions"]>[number];

const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "manage_users", label: "用户管理" },
  { key: "manage_content", label: "内容管理" },
  { key: "manage_forum", label: "论坛管理" },
  { key: "manage_cms", label: "页面 CMS" },
  { key: "manage_deletion", label: "删帖" },
  { key: "grant_wiki_create", label: "授予建词条" },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "站长",
  admin: "管理员",
  moderator: "版主",
  editor: "编辑",
  member: "成员",
  guest: "访客",
};

const STATUS_LABEL: Record<string, string> = {
  active: "正常",
  muted: "禁言中",
  banned: "已封禁",
  deleted: "已注销",
};

const inputCls =
  "rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft";
const selectCls = inputCls;

export function UserManager() {
  const { me, pending } = useMe();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detailMsg, setDetailMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = me?.role === "owner";
  const allowed = me && (isAdminRole(me.role) || (me.permissions ?? []).includes("manage_users"));

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      setErr("");
      request<ListResult<AdminUser>>("/admin/users", {
        query: {
          page: p,
          perPage: 15,
          q: q || undefined,
          group: group || undefined,
          role: role || undefined,
          status: status || undefined,
        },
      })
        .then((r) => {
          setItems(r.data);
          setTotalPages(r.pagination.totalPages);
          setTotal(r.pagination.total);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 403)
            setErr("当前账号没有用户管理权限（需开启 manage_users 开关）。");
          else setErr("加载失败，后端可能未在线。");
        })
        .finally(() => setLoading(false));
    },
    [q, group, role, status],
  );

  useEffect(() => {
    if (allowed) load(page);
  }, [allowed, page, load]);

  const openDetail = (u: AdminUser) => {
    setDetailMsg("");
    request<{ data: AdminUser }>(`/admin/users/${u.id}`)
      .then((r) => setSelected(r.data))
      .catch(() => {
        setSelected(u);
        setDetailMsg("详情接口读取失败，显示列表数据。");
      });
  };

  const patch = (body: Record<string, unknown>, okText: string) => {
    if (!selected || busy) return;
    setBusy(true);
    setDetailMsg("");
    request<{ data: AdminUser }>(`/admin/users/${selected.id}`, {
      method: "PATCH",
      body,
    })
      .then((r) => {
        setSelected(r.data);
        setItems((prev) => prev.map((x) => (x.id === r.data.id ? r.data : x)));
        setDetailMsg(okText);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403)
          setDetailMsg("无权限执行该操作（角色与权限开关仅站长可改）。");
        else if (e instanceof ApiError)
          setDetailMsg(`操作失败：${e.problem.detail ?? e.problem.title}`);
        else setDetailMsg("无法连接后端。");
      })
      .finally(() => setBusy(false));
  };

  if (pending) return <p className="py-16 text-center text-small text-faint">正在校验权限…</p>;

  if (!allowed) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-h1 font-semibold">无访问权限</h1>
        <p className="mt-3 text-small text-secondary">
          用户管理需要管理员身份并开启 manage_users 权限开关。
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">用户与权限管理</h1>
        <span className="font-mono text-caption text-faint">共 {total} 人</span>
      </div>

      {/* 筛选栏 */}
      <form
        className="mt-6 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索用户名 / 邮箱 / 手机号"
          className={`${inputCls} w-64`}
        />
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectCls} aria-label="用户组筛选">
          <option value="">全部用户组</option>
          <option value="normal">普通（仅阅览）</option>
          <option value="verified">认证</option>
          <option value="premium">付费</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls} aria-label="角色筛选">
          <option value="">全部角色</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="状态筛选">
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-amber px-4 py-2 text-small font-medium text-amber-fg hover:opacity-90">
          查询
        </button>
      </form>

      {err && <p role="alert" className="mt-4 text-small text-danger">{err}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* 用户列表 */}
        <div className="overflow-hidden rounded-md border border-border-subtle bg-surface">
          {loading ? (
            <p className="p-8 text-center text-small text-faint">载入中…</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center font-mono text-caption text-faint">没有匹配的用户。</p>
          ) : (
            <ol className="divide-y divide-border-subtle">
              {items.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(u)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-raised ${
                      selected?.id === u.id ? "bg-raised" : ""
                    }`}
                  >
                    <Avatar url={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                    <span className="min-w-0 grow">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-small font-medium text-primary">
                          {u.displayName}
                        </span>
                        <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                        <UserGroupBadge group={u.group} level={u.level} />
                        <UserStatusMark status={u.status} />
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-caption text-faint">
                        @{u.username} · {u.email}
                      </span>
                    </span>
                    <span aria-hidden className="font-mono text-caption text-faint">→</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40">
                ← 上一页
              </button>
              <span className="font-mono text-caption text-faint">第 {page} / {totalPages} 页</span>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40">
                下一页 →
              </button>
            </div>
          )}
        </div>

        {/* 详情 / 操作面板 */}
        <div className="rounded-md border border-border-subtle bg-surface p-5">
          {!selected ? (
            <p className="py-12 text-center font-mono text-caption text-faint">
              点击左侧用户查看详情与操作
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-3">
                  <Avatar url={selected.avatarUrl} name={selected.displayName || selected.username} size="lg" />
                  <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-primary">
                    {selected.displayName}
                    <UserGroupBadge group={selected.group} level={selected.level} />
                    <UserStatusMark status={selected.status} />
                  </p>
                </div>
                <p className="mt-1 font-mono text-caption text-faint">
                  @{selected.username} · {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </p>
                <p className="mt-1 font-mono text-caption text-faint">
                  注册 {selected.createdAt.slice(0, 10)}
                  {selected.lastActiveAt && ` · 最近活跃 ${selected.lastActiveAt.slice(0, 10)}`}
                </p>
                {selected.banReason && (
                  <p className="mt-1 text-caption text-danger">封禁原因：{selected.banReason}</p>
                )}
              </div>

              {/* 组与等级 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-mono text-caption text-faint">用户组</span>
                  <select
                    value={selected.group}
                    disabled={busy}
                    onChange={(e) => patch({ group: e.target.value }, "用户组已更新。")}
                    className={selectCls + " w-full"}
                  >
                    <option value="normal">普通（仅阅览）</option>
                    <option value="verified">认证</option>
                    <option value="premium">付费</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-caption text-faint">等级（1-10）</span>
                  <select
                    value={selected.level}
                    disabled={busy}
                    onChange={(e) => patch({ level: Number(e.target.value) }, "等级已更新。")}
                    className={selectCls + " w-full"}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Lv.{n}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 封禁 / 解禁 / 禁言 */}
              <div className="flex flex-wrap gap-2">
                {selected.status === "banned" ? (
                  <button type="button" disabled={busy} onClick={() => patch({ status: "active" }, "已解禁。")}
                    className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40">
                    解除封禁
                  </button>
                ) : (
                  <button type="button" disabled={busy}
                    onClick={() => {
                      if (window.confirm(`确认封禁 ${selected.displayName}？封禁后该账号无法登录访问。`))
                        patch({ status: "banned" }, "已封禁。");
                    }}
                    className="rounded-md border border-danger px-3 py-1.5 text-small text-danger hover:bg-danger hover:text-white disabled:opacity-40">
                    封禁账号
                  </button>
                )}
                {selected.status === "muted" ? (
                  <button type="button" disabled={busy} onClick={() => patch({ status: "active" }, "已解除禁言。")}
                    className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40">
                    解除禁言
                  </button>
                ) : (
                  <button type="button" disabled={busy}
                    onClick={() => {
                      if (window.confirm(`确认禁言 ${selected.displayName}？禁言期间可浏览但不可发言。`))
                        patch({ status: "muted" }, "已禁言。");
                    }}
                    className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-danger hover:text-danger disabled:opacity-40">
                    禁言
                  </button>
                )}
              </div>

              {/* Wiki 建词条资格 */}
              <label className="flex items-center gap-2 text-small text-secondary">
                <input
                  type="checkbox"
                  className="accent-amber"
                  checked={!!selected.wikiCreateGranted}
                  disabled={busy}
                  onChange={(e) =>
                    patch({ wikiCreateGranted: e.target.checked }, e.target.checked ? "已授予 Wiki 建词条资格。" : "已收回 Wiki 建词条资格。")
                  }
                />
                授予 Wiki 词条创建资格（wikiCreateGranted）
              </label>

              {/* 权限开关（仅 owner） */}
              <fieldset disabled={!isOwner || busy}>
                <legend className="font-mono text-caption text-faint">
                  管理权限开关{isOwner ? "" : "（仅站长可配置）"}
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => {
                    const on = (selected.permissions ?? []).includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-small text-secondary">
                        <input
                          type="checkbox"
                          className="accent-amber"
                          checked={on}
                          onChange={(e) => {
                            const cur = new Set(selected.permissions ?? []);
                            if (e.target.checked) cur.add(p.key);
                            else cur.delete(p.key);
                            patch({ permissions: [...cur] }, "权限开关已更新。");
                          }}
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* 角色（仅 owner） */}
              {isOwner && (
                <label className="block">
                  <span className="mb-1 block font-mono text-caption text-faint">角色（仅站长可分配）</span>
                  <select
                    value={selected.role}
                    disabled={busy}
                    onChange={(e) => {
                      if (window.confirm(`确认将 ${selected.displayName} 的角色改为「${ROLE_LABEL[e.target.value]}」？`))
                        patch({ role: e.target.value }, "角色已更新。");
                    }}
                    className={selectCls + " w-full"}
                  >
                    {["member", "editor", "moderator", "admin"].map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </label>
              )}

              {detailMsg && <p role="status" className="text-caption text-secondary">{detailMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
