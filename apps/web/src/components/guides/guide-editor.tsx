"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request, API_BASE_URL } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { getAccessToken } from "@/lib/session";
import { isAdminRole } from "@/lib/me";
import type { Guide } from "@/lib/api";
import { Markdown } from "@/components/markdown";

/**
 * 攻略编辑器（客户端组件）。
 * - 新建：POST /guides；编辑：PATCH /guides/:slug
 * - 门禁：需登录；编辑模式限作者本人或 admin（其余显示 403 提示，保存仍兜底处理 403）
 * - 正文 Markdown，支持「编辑 / 预览」切换与图片上传插入（POST /uploads）
 * - 本地草稿：内容自动暂存 localStorage，可恢复/丢弃；保存成功后清除
 */

interface Me {
  id: string;
  role?: string;
  guideCreateGranted?: boolean;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Status = "draft" | "published" | "archived";

interface DraftSnapshot {
  title: string;
  relatedCharacter: string;
  tags: string;
  content: string;
  status: Status;
  savedAt: number;
}

function describeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "登录已失效，请重新登录。";
    if (e.status === 403) return "权限不足：只能编辑自己的攻略。";
    if (e.status === 409) return "slug 已被占用，请更换一个。";
    if (e.status === 429)
      return `操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`;
    return e.problem.detail ?? e.problem.title;
  }
  return fallback;
}

/** 后端目前将 status 以大写返回（见 Issue #22），归一化为契约小写枚举 */
function normalizeStatus(s?: string): Status {
  const v = s?.toLowerCase();
  return v === "published" || v === "archived" ? v : "draft";
}

export function GuideEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Guide;
}) {
  const router = useRouter();
  const slugKey = mode === "edit" && initial ? initial.slug : "new";
  const draftKey = `nodusfall.guide-draft.${slugKey}`;

  const [phase, setPhase] = useState<"loading" | "forbidden" | "ready">(
    "loading",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState("");
  const [relatedCharacter, setRelatedCharacter] = useState(
    initial?.relatedCharacter ?? "",
  );
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [content, setContent] = useState(
    typeof initial?.content === "string" ? initial.content : "",
  );
  const [status, setStatus] = useState<Status>(
    normalizeStatus(initial?.status),
  );
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? "");
  const [categories, setCategories] = useState<
    { slug: string; name: string }[]
  >([]);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [draftBanner, setDraftBanner] = useState<DraftSnapshot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 登录与权限门禁：编辑模式限作者本人或 admin
  useEffect(() => {
    if (!getAccessToken()) {
      setPhase("forbidden");
      return;
    }
    request<{ data: Me }>("/users/me")
      .then((r) => {
        if (mode === "edit" && initial) {
          const isAuthor = r.data.id === initial.author.id;
          // 权限体系 v2（PR #119）：作者本人、admin/owner 或攻略版主可编辑
          const isAdmin =
            isAdminRole(r.data.role) || r.data.role === "guide_moderator";
          setPhase(isAuthor || isAdmin ? "ready" : "forbidden");
        } else {
          // 新建：攻略小编/版主、admin/owner 或被授予 guideCreateGranted 的成员
          const canCreate =
            isAdminRole(r.data.role) ||
            r.data.role === "guide_editor" ||
            r.data.role === "guide_moderator" ||
            r.data.guideCreateGranted === true;
          setPhase(canCreate ? "ready" : "forbidden");
        }
      })
      .catch(() => setPhase("forbidden"));
  }, [mode, initial]);

  // 攻略分类（GET /guides/categories；无默认值时取 general）
  useEffect(() => {
    request<{ data: { slug: string; name: string }[] }>("/guides/categories", {
      auth: false,
    })
      .then((r) => {
        const list = [...r.data].sort(
          (a, b) =>
            ((a as { sortOrder?: number }).sortOrder ?? 0) -
            ((b as { sortOrder?: number }).sortOrder ?? 0),
        );
        setCategories(list);
        setCategorySlug((cur) => {
          if (cur && list.some((c) => c.slug === cur)) return cur;
          if (list.some((c) => c.slug === "general")) return "general";
          return list[0]?.slug ?? "";
        });
      })
      .catch(() => setCategories([]));
  }, []);

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
        draft.relatedCharacter === (initial.relatedCharacter ?? "");
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
        relatedCharacter,
        tags,
        content,
        status,
        savedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(snapshot));
      } catch {
        // 存储满或不可用则静默跳过
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [phase, draftBanner, title, relatedCharacter, tags, content, status, draftKey]);

  const applyDraft = useCallback((draft: DraftSnapshot) => {
    setTitle(draft.title);
    setRelatedCharacter(draft.relatedCharacter);
    setTags(draft.tags);
    setContent(draft.content);
    setStatus(draft.status);
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

  const save = () => {
    if (saving) return;
    if (!title.trim()) {
      setMsg("请填写标题。");
      return;
    }
    if (!content.trim()) {
      setMsg("请填写正文。");
      return;
    }
    if (mode === "create" && slug && !SLUG_PATTERN.test(slug)) {
      setMsg("slug 只能包含小写字母、数字和连字符（如 blade-build-s1）。");
      return;
    }
    setSaving(true);
    setMsg("");
    const tagList = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const call =
      mode === "create"
        ? request<{ data: Guide }>("/guides", {
            method: "POST",
            body: {
              title: title.trim(),
              slug: slug.trim() || undefined,
              tags: tagList,
              content,
              status: status === "archived" ? "draft" : status,
              relatedCharacter: relatedCharacter.trim() || undefined,
              categorySlug: categorySlug || undefined,
            },
          })
        : request<{ data: Guide }>(`/guides/${initial!.slug}`, {
            method: "PATCH",
            body: {
              title: title.trim(),
              tags: tagList,
              content,
              status,
              relatedCharacter: relatedCharacter.trim() || undefined,
              categorySlug: categorySlug || null,
            },
          });

    call
      .then((r) => {
        clearDraft();
        router.push(`/guides/${r.data.slug}`);
        router.refresh();
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
          {mode === "edit"
            ? "只有攻略作者本人或管理员可以编辑这篇攻略。"
            : "登录后即可撰写攻略。"}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90"
          >
            去登录
          </Link>
          <Link
            href="/guides"
            className="rounded-md border border-border-subtle px-6 py-2.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
          >
            返回攻略列表
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
            placeholder="攻略标题"
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
              placeholder="blade-build-s1"
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
            关联角色（可留空）
          </span>
          <input
            value={relatedCharacter}
            onChange={(e) => setRelatedCharacter(e.target.value)}
            maxLength={60}
            placeholder="例如：某位角色的名字"
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">
            分类
          </span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft"
          >
            {categories.length === 0 && <option value="">未分类</option>}
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">
            状态
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary focus:border-amber-soft"
          >
            <option value="draft">草稿（暂不公开展示）</option>
            <option value="published">发布</option>
            {mode === "edit" && <option value="archived">归档</option>}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-caption text-faint">
          标签（用逗号分隔，可留空）
        </span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="开荒, 配装, 共斗"
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

      <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-amber px-8 py-2.5 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "保存中…" : mode === "create" ? "发布攻略" : "保存修改"}
        </button>
        <Link
          href={mode === "edit" && initial ? `/guides/${initial.slug}` : "/guides"}
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
