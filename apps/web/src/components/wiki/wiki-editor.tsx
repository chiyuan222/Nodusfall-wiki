"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  request,
  API_BASE_URL,
  type ListResult,
} from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import type { WikiCategory, WikiPage, WikiPageRevision } from "@/lib/api";
import { Markdown } from "@/components/markdown";
import { authorName } from "@/lib/author";

/**
 * Wiki 条目编辑器（客户端组件）。
 * - 新建：POST /wiki/pages；编辑：PATCH /wiki/pages/:slug
 * - 角色门禁：仅 admin / editor 可进入（其余显示 403 提示，保存时仍兜底处理 403）
 * - 正文 Markdown，支持「编辑 / 预览」切换与图片上传插入（POST /uploads）
 * - 本地草稿：内容自动暂存 localStorage，可恢复/丢弃；保存成功后清除
 */

interface Me {
  id: string;
  role?: string;
  wikiCreateGranted?: boolean;
}

const EDITOR_ROLES = new Set(["admin", "owner", "wiki_editor", "wiki_moderator"]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Status = "draft" | "published" | "archived";

interface DraftSnapshot {
  title: string;
  categorySlug: string;
  tags: string;
  content: string;
  status: Status;
  changelog: string;
  savedAt: number;
}

function describeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 403) return "权限不足：仅管理员或编辑可以维护 Wiki 条目。";
    if (e.status === 409) return "slug 已被占用，请更换一个。";
    if (e.status === 429)
      return `操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`;
    return e.problem.detail ?? e.problem.title;
  }
  return fallback;
}

export function WikiEditor({
  mode,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  initial?: WikiPage;
  categories: WikiCategory[];
}) {
  const router = useRouter();
  const slugKey = mode === "edit" && initial ? initial.slug : "new";
  const draftKey = `nodusfall.wiki-draft.${slugKey}`;

  const [phase, setPhase] = useState<"loading" | "forbidden" | "ready">(
    "loading",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState(
    initial?.categorySlug ?? categories[0]?.slug ?? "",
  );
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [content, setContent] = useState(initial?.content ?? "");
  // 后端目前将 status 以大写返回（如 "PUBLISHED"，见 Issue：status 大小写与契约不符），
  // 此处归一化为契约小写枚举，避免编辑时原样回传被 400 拒绝
  const normalizeStatus = (s?: string): Status => {
    const v = s?.toLowerCase();
    return v === "published" || v === "archived" ? v : "draft";
  };
  const [status, setStatus] = useState<Status>(
    normalizeStatus(initial?.status),
  );
  const [changelog, setChangelog] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [draftBanner, setDraftBanner] = useState<DraftSnapshot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 登录与角色门禁
  useEffect(() => {
    if (!getAccessToken()) {
      setPhase("forbidden");
      return;
    }
    request<{ data: Me }>("/users/me")
      .then((r) => {
        const role = r.data.role?.toLowerCase() ?? "";
        // 权限体系 v2：编辑需小编/版主/管理；新建额外放行 wikiCreateGranted 成员
        const ok =
          EDITOR_ROLES.has(role) ||
          (mode === "create" && r.data.wikiCreateGranted === true);
        setPhase(ok ? "ready" : "forbidden");
      })
      .catch(() => setPhase("forbidden"));
  }, [mode]);

  // 启动时探测本地草稿（编辑模式下仅当内容不同才提示）
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftSnapshot;
      const sameAsInitial =
        mode === "edit" &&
        initial &&
        draft.title === initial.title &&
        draft.content === initial.content &&
        draft.tags === (initial.tags ?? []).join(", ") &&
        draft.categorySlug === initial.categorySlug;
      if (!sameAsInitial && (draft.title || draft.content)) {
        setDraftBanner(draft);
      }
    } catch {
      // 草稿损坏则忽略
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // 自动暂存草稿（防抖 800ms）；草稿横幅待处理时暂停写入，避免覆盖待恢复的草稿
  useEffect(() => {
    if (phase !== "ready" || draftBanner) return;
    const timer = window.setTimeout(() => {
      if (!title && !content) return;
      const snapshot: DraftSnapshot = {
        title,
        categorySlug,
        tags,
        content,
        status,
        changelog,
        savedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(snapshot));
      } catch {
        // 存储满或不可用则静默跳过
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [phase, draftBanner, title, categorySlug, tags, content, status, changelog, draftKey]);

  const applyDraft = useCallback((draft: DraftSnapshot) => {
    setTitle(draft.title);
    setCategorySlug(draft.categorySlug);
    setTags(draft.tags);
    setContent(draft.content);
    setStatus(draft.status);
    setChangelog(draft.changelog);
    setDraftBanner(null);
  }, []);

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftBanner(null);
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  /** 从标题生成 slug 建议（仅拉丁字符；中文标题留空交给后端生成） */
  const suggestSlug = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);

  const uploadImage = async (file: File) => {
    const token = getAccessToken();
    if (!token) return;
    setUploading(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        setMsg(`图片上传失败（HTTP ${res.status}）。`);
        return;
      }
      const json = (await res.json()) as { data?: { url?: string } };
      const url = json.data?.url ?? "";
      if (!url) {
        setMsg("上传响应缺少 url 字段。");
        return;
      }
      // 在光标处插入 Markdown 图片语法
      const textarea = contentRef.current;
      const snippet = `![${file.name.replace(/\.[^.]+$/, "")}](${url})`;
      if (textarea) {
        const start = textarea.selectionStart ?? content.length;
        const next =
          content.slice(0, start) + "\n" + snippet + "\n" + content.slice(start);
        setContent(next);
      } else {
        setContent((c) => `${c}\n${snippet}\n`);
      }
      setMsg("图片已插入正文。");
    } catch {
      setMsg("无法连接后端，图片上传失败。");
    } finally {
      setUploading(false);
    }
  };

  const save = (target: Status) => {
    if (saving) return;
    if (!title.trim()) {
      setMsg("请填写标题。");
      return;
    }
    if (!content.trim()) {
      setMsg("请填写正文。");
      return;
    }
    if (!categorySlug) {
      setMsg("请选择分类。");
      return;
    }
    if (mode === "create" && slug && !SLUG_PATTERN.test(slug)) {
      setMsg("slug 只能包含小写字母、数字和连字符（如 aether-blade）。");
      return;
    }
    if (
      target === "published" &&
      !window.confirm("确认发布？发布后全站可见。")
    )
      return;
    if (target === "archived" && !window.confirm("确认归档？归档后不再公开展示。"))
      return;
    setSaving(true);
    setMsg("");
    setStatus(target);
    const tagList = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const call =
      mode === "create"
        ? request<{ data: WikiPage }>("/wiki/pages", {
            method: "POST",
            body: {
              title: title.trim(),
              slug: slug.trim() || undefined,
              categorySlug,
              tags: tagList,
              content,
              status: target === "archived" ? "draft" : target,
              changelog: changelog.trim() || undefined,
            },
          })
        : request<{ data: WikiPage }>(`/wiki/pages/${initial!.slug}`, {
            method: "PATCH",
            body: {
              title: title.trim(),
              categorySlug,
              tags: tagList,
              content,
              status: target,
              changelog: changelog.trim() || undefined,
            },
          });

    call
      .then((r) => {
        clearDraft();
        if (target === "draft") {
          setMsg("草稿已保存，仅自己可见。可在「我的草稿」中继续编辑。");
          // 新建草稿：转到编辑路由续写，避免落到他人不可见的详情页
          if (mode === "create") router.replace(`/wiki/${r.data.slug}/edit`);
        } else {
          router.push(`/wiki/${r.data.slug}`);
          router.refresh();
        }
      })
      .catch((e: unknown) => {
        setMsg(describeError(e, "无法连接后端，请稍后重试。"));
      })
      .finally(() => setSaving(false));
  };

  if (phase === "loading") {
    return <p className="py-8 text-center text-small text-faint">载入中…</p>;
  }

  if (phase === "forbidden") {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">
          Wiki 条目仅管理员与编辑可以创建和维护。
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90"
          >
            去登录
          </Link>
          <Link
            href="/wiki"
            className="rounded-md border border-border-subtle px-6 py-2.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
          >
            返回 Wiki
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {draftBanner && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border border-amber-soft bg-raised px-4 py-3"
        >
          <p className="text-small text-secondary">
            检测到 {new Date(draftBanner.savedAt).toLocaleString("zh-CN")}{" "}
            的本地草稿「{draftBanner.title || "未命名"}」。
          </p>
          <button
            type="button"
            onClick={() => applyDraft(draftBanner)}
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg hover:opacity-90"
          >
            恢复草稿
          </button>
          <button
            type="button"
            onClick={discardDraft}
            className="text-small text-faint hover:text-danger"
          >
            丢弃
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">
            标题 *
          </span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (mode === "create" && !slugEdited)
                setSlug(suggestSlug(e.target.value));
            }}
            maxLength={120}
            placeholder="条目标题"
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
          />
        </label>

        {mode === "create" ? (
          <label className="block">
            <span className="mb-1 block font-mono text-caption text-faint">
              slug（留空自动生成）
            </span>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="aether-blade"
              className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 font-mono text-small text-primary placeholder:text-faint focus:border-amber-soft"
            />
          </label>
        ) : (
          <div>
            <span className="mb-1 block font-mono text-caption text-faint">
              slug（不可修改）
            </span>
            <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 font-mono text-small text-faint">
              {initial!.slug}
            </p>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">
            分类 *
          </span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft"
          >
            {categories.length === 0 && <option value="">（暂无分类）</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block font-mono text-caption text-faint">
            当前状态
          </span>
          <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-small text-secondary">
            {status === "published" ? (
              <span className="text-amber">已发布 · 全站可见</span>
            ) : status === "archived" ? (
              <span className="text-faint">已归档</span>
            ) : (
              <span>草稿 · 仅自己可见</span>
            )}
          </p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-caption text-faint">
          标签（用逗号分隔，可留空）
        </span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="武器, 火属性, 限时活动"
          className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
        />
      </label>

      {/* 正文：编辑 / 预览 */}
      <div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="正文模式"
            className="flex rounded-md border border-border-subtle"
          >
            {(
              [
                ["write", "编辑"],
                ["preview", "预览"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 text-small transition-colors duration-fast ${
                  tab === key
                    ? "bg-amber text-amber-fg"
                    : "text-secondary hover:text-amber"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="grow" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
          >
            {uploading ? "上传中…" : "插入图片"}
          </button>
        </div>

        {tab === "write" ? (
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            placeholder={"支持 Markdown：\n## 小节标题\n**加粗**、列表、表格、图片等"}
            className="mt-3 w-full rounded-md border border-border-subtle bg-raised px-3 py-2 font-mono text-small leading-relaxed text-primary placeholder:text-faint focus:border-amber-soft"
          />
        ) : (
          <div className="mt-3 min-h-60 rounded-md border border-border-subtle bg-surface px-4 py-3">
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <p className="text-small text-faint">（暂无内容可预览）</p>
            )}
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-caption text-faint">
          变更说明（可留空，将记入版本历史）
        </span>
        <input
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          maxLength={200}
          placeholder={mode === "create" ? "创建条目" : "本次修改了什么…"}
          className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-5">
        <button
          type="button"
          onClick={() => save("published")}
          disabled={saving}
          className="rounded-md bg-amber px-8 py-2.5 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "保存中…" : status === "published" ? "保存并发布" : "发布"}
        </button>
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={saving}
          className="rounded-md border border-border-subtle px-6 py-2.5 text-small text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
        >
          保存草稿（仅自己可见）
        </button>
        {mode === "edit" && status !== "archived" && (
          <button
            type="button"
            onClick={() => save("archived")}
            disabled={saving}
            className="rounded-md border border-border-subtle px-4 py-2.5 text-small text-faint hover:border-danger hover:text-danger disabled:opacity-40"
          >
            归档
          </button>
        )}
        <Link
          href={mode === "edit" && initial ? `/wiki/${initial.slug}` : "/wiki"}
          className="rounded-md border border-border-subtle px-6 py-2.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
        >
          取消
        </Link>
        {msg && (
          <span role="alert" className="text-caption text-secondary">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

/** 版本历史面板（编辑页用，客户端加载） */
export function RevisionList({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WikiPageRevision[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (items !== null || loading) return;
    setLoading(true);
    request<ListResult<WikiPageRevision>>(`/wiki/pages/${slug}/revisions`)
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  return (
    <section
      aria-label="版本历史"
      className="rounded-md border border-border-subtle bg-surface"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="flex w-full items-center justify-between px-5 py-3 text-small text-secondary transition-colors duration-fast hover:text-amber"
      >
        <span className="font-mono text-caption uppercase tracking-[0.3em] text-faint">
          版本历史
        </span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-border-subtle px-5 py-4">
          {loading ? (
            <p className="text-small text-faint">载入中…</p>
          ) : !items || items.length === 0 ? (
            <p className="text-small text-faint">暂无历史版本。</p>
          ) : (
            <ol className="space-y-3">
              {items.map((rev) => (
                <li
                  key={rev.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-small"
                >
                  <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
                    v{rev.version}
                  </span>
                  <span className="text-primary">
                    {rev.changelog || "（无变更说明）"}
                  </span>
                  <span className="ml-auto font-mono text-caption text-faint">
                    {authorName(rev.author)} ·{" "}
                    {new Date(rev.createdAt).toLocaleString("zh-CN")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
