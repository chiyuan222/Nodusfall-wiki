"use client";

import { useCallback, useEffect, useState } from "react";
import {
  videoApi,
  type VideoEntry,
  type VideoInput,
  type VideoKind,
  type VideoPlatform,
} from "@/lib/api";
import { PLATFORM_LABEL, VIDEO_KINDS } from "@/components/videos/video-hub";
import { useMe, isAdminRole, hasPermission } from "@/lib/me";
import Link from "next/link";

/**
 * 相关视频管理（契约 PR #67）：增删改、分区、排序、发布/隐藏。
 * 优先 GET /admin/videos（含未发布）；该端点未上线时回退公开列表（仅已发布）并提示。
 * 权限：管理员角色或 manage_content 开关；其余显示无权限提示。
 */

const inputCls =
  "w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none";

interface FormState {
  kind: VideoKind;
  title: string;
  url: string;
  platform: VideoPlatform;
  coverImage: string;
  description: string;
  sortOrder: string;
  published: boolean;
}

const EMPTY_FORM: FormState = {
  kind: "official",
  title: "",
  url: "",
  platform: "bilibili",
  coverImage: "",
  description: "",
  sortOrder: "0",
  published: true,
};

function toInput(f: FormState): VideoInput {
  return {
    kind: f.kind,
    title: f.title.trim(),
    url: f.url.trim(),
    platform: f.platform,
    coverImage: f.coverImage.trim() || null,
    description: f.description.trim() || null,
    sortOrder: Number(f.sortOrder) || 0,
    published: f.published,
  };
}

export function VideoManager() {
  const { me, pending } = useMe();
  const [kindFilter, setKindFilter] = useState<VideoKind | "all">("all");
  const [items, setItems] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fallback, setFallback] = useState(false); // 管理端点未上线，仅显示已发布

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed =
    !!me && (isAdminRole(me.role) || hasPermission(me, "manage_content"));

  const load = useCallback((kind: VideoKind | "all") => {
    setLoading(true);
    setErr("");
    const k = kind === "all" ? undefined : kind;
    videoApi
      .adminList(k, 1)
      .then((r) => {
        setItems(r.data);
        setFallback(false);
      })
      .catch((e: { problem?: { status?: number } }) => {
        if (e?.problem?.status === 404) {
          // 管理列表端点未上线：回退公开列表（仅已发布）
          return videoApi
            .list(k, 1, 50)
            .then((r) => {
              setItems(r.data);
              setFallback(true);
            })
            .catch(() => setErr("视频列表加载失败，后端服务可能尚未上线。"));
        }
        setErr("视频列表加载失败，后端服务可能尚未上线。");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (allowed) load(kindFilter);
  }, [allowed, kindFilter, load]);

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
        当前账号无内容管理权限，请联系站长开启 manage_content 开关。
      </p>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, kind: kindFilter === "all" ? "official" : kindFilter });
    setFormErr("");
    setFormOpen(true);
  };

  const openEdit = (v: VideoEntry) => {
    setEditingId(v.id);
    setForm({
      kind: v.kind,
      title: v.title,
      url: v.url,
      platform: v.platform,
      coverImage: v.coverImage ?? "",
      description: v.description ?? "",
      sortOrder: String(v.sortOrder),
      published: v.published,
    });
    setFormErr("");
    setFormOpen(true);
  };

  const save = () => {
    if (!form.title.trim() || !form.url.trim()) {
      setFormErr("标题与链接为必填项。");
      return;
    }
    setSaving(true);
    setFormErr("");
    const req = editingId
      ? videoApi.update(editingId, toInput(form))
      : videoApi.create(toInput(form));
    req
      .then(() => {
        setFormOpen(false);
        load(kindFilter);
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setFormErr(e?.problem?.detail ?? "保存失败，请稍后重试。"),
      )
      .finally(() => setSaving(false));
  };

  const togglePublish = (v: VideoEntry) => {
    setBusyId(v.id);
    videoApi
      .update(v.id, { published: !v.published })
      .then(() => load(kindFilter))
      .catch(() => setErr("状态更新失败，请稍后重试。"))
      .finally(() => setBusyId(null));
  };

  const remove = (v: VideoEntry) => {
    if (!window.confirm(`确定删除视频「${v.title}」？此操作不可恢复。`)) return;
    setBusyId(v.id);
    videoApi
      .remove(v.id)
      .then(() => load(kindFilter))
      .catch(() => setErr("删除失败，请稍后重试。"))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="space-y-4">
      {/* 筛选 + 新增 */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="按分区筛选" className="flex gap-1 rounded-md border border-border-subtle bg-surface p-1">
          {[{ key: "all" as const, label: "全部" }, ...VIDEO_KINDS].map((k) => (
            <button
              key={k.key}
              type="button"
              role="tab"
              aria-selected={kindFilter === k.key}
              onClick={() => setKindFilter(k.key as VideoKind | "all")}
              className={`rounded-md px-3 py-1 text-caption transition-colors duration-fast ${
                kindFilter === k.key
                  ? "bg-amber font-medium text-amber-fg"
                  : "text-secondary hover:text-amber"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          + 新增视频
        </button>
      </div>

      {fallback && (
        <p className="rounded-md border border-amber-soft/60 bg-raised px-4 py-2 text-caption text-secondary">
          管理列表端点（GET /admin/videos）尚未上线，当前仅显示已发布条目；「隐藏」后的条目将暂不可见，待后端补充端点后恢复管理。
        </p>
      )}

      {/* 编辑/新增表单 */}
      {formOpen && (
        <div className="space-y-3 rounded-md border border-amber-soft/60 bg-surface p-4">
          <p className="text-small font-medium text-primary">
            {editingId ? "编辑视频" : "新增视频"}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-caption text-faint">分区 *</span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as VideoKind })}
                className={inputCls}
              >
                {VIDEO_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-caption text-faint">平台</span>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value as VideoPlatform })}
                className={inputCls}
              >
                {(Object.keys(PLATFORM_LABEL) as VideoPlatform[]).map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-caption text-faint">标题 *</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              placeholder="视频标题"
              className={inputCls}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption text-faint">视频链接 *（B站/抖音/YouTube 等原平台地址）</span>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className={inputCls}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption text-faint">封面图链接（可选）</span>
            <input
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://…（留空显示播放符占位）"
              className={inputCls}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption text-faint">简介（可选，最多 500 字）</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={2}
              className={`${inputCls} resize-y`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-small text-secondary">
              <span className="text-caption text-faint">排序值（小在前）</span>
              <input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                type="number"
                className="w-24 rounded-md border border-border-subtle bg-page px-3 py-1.5 text-small text-primary focus:border-amber-soft focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-small text-secondary">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="accent-amber"
              />
              发布（取消勾选为隐藏）
            </label>
          </div>
          {formErr && <p role="alert" className="text-caption text-danger">{formErr}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "保存中…" : editingId ? "保存修改" : "创建"}
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : err ? (
          <p role="alert" className="p-6 text-center text-small text-faint">{err}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">
            暂无条目，点击右上角「新增视频」开始收录。
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((v) => (
              <li key={v.id} className="flex items-center gap-4 px-5 py-3">
                {v.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外链封面
                  <img
                    src={v.coverImage}
                    alt=""
                    loading="lazy"
                    className="h-12 w-20 shrink-0 rounded-sm border border-border-subtle object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-sm border border-border-subtle bg-raised text-caption text-faint">
                    无封面
                  </span>
                )}
                <div className="min-w-0 grow">
                  <p className="truncate text-small font-medium text-primary">{v.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-faint">
                    <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono">
                      {VIDEO_KINDS.find((k) => k.key === v.kind)?.label ?? v.kind}
                    </span>
                    <span>{PLATFORM_LABEL[v.platform]}</span>
                    <span className="font-mono">排序 {v.sortOrder}</span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-faint underline-offset-4 hover:text-amber hover:underline"
                    >
                      {v.url}
                    </a>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 text-caption ${
                    v.published ? "bg-amber/10 text-amber" : "bg-raised text-faint"
                  }`}
                >
                  {v.published ? "已发布" : "已隐藏"}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === v.id}
                    onClick={() => openEdit(v)}
                    className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    disabled={busyId === v.id}
                    onClick={() => togglePublish(v)}
                    className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
                  >
                    {v.published ? "隐藏" : "发布"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === v.id}
                    onClick={() => remove(v)}
                    className="rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary hover:border-danger hover:text-danger disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
