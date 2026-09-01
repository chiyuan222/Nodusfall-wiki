"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forumApi } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { useMe, canPost } from "@/lib/me";
import { Markdown } from "@/components/markdown";
import { MediaField } from "@/components/admin/editor-controls";
import { emptyMedia } from "@/lib/world-content";

/**
 * 发布主题表单：标题 + 可选封面（POST /uploads 直传）+ Markdown 正文（支持预览）。
 * 成功后跳转帖子详情页。
 * 契约 PR #51：normal 组 / muted / banned 不可发帖（不渲染表单）。
 */
export function NewThreadForm({ boardSlug }: { boardSlug: string }) {
  const router = useRouter();
  const { me, pending } = useMe();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState(() => emptyMedia());
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = () => {
    if (submitting) return;
    if (!title.trim() || !content.trim()) {
      setMsg("标题与正文都不能为空。");
      return;
    }
    setSubmitting(true);
    setMsg("");
    forumApi
      .createThread(boardSlug, {
        title: title.trim(),
        content: content.trim(),
        coverImage: cover.src.trim() || null,
      })
      .then((thread) => {
        router.push(`/forum/threads/${thread.id}`);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setMsg("登录已失效，请重新登录后再发布。");
        } else if (e instanceof ApiError && e.status === 429) {
          setMsg(`操作太频繁，请 ${e.retryAfter ?? "稍后"} 秒后再试。`);
        } else if (e instanceof ApiError) {
          setMsg(`发布失败：${e.problem.detail ?? e.problem.title}`);
        } else {
          setMsg("无法连接后端，请稍后重试。");
        }
        setSubmitting(false);
      });
  };

  if (pending) {
    return <p className="py-16 text-center text-small text-faint">载入中…</p>;
  }

  if (!me) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">发布主题需要先登录。</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }

  if (!canPost(me)) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface p-8 text-center">
        <p className="text-body text-secondary">
          {me.status === "muted"
            ? "账号处于禁言状态，暂不可发布主题。"
            : me.status === "banned"
              ? "账号已被封禁，仅可浏览。"
              : "当前用户组仅支持浏览，暂不可发布主题。"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-mono text-caption text-faint">标题</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="一句话说清楚主题"
          className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2.5 text-body text-primary placeholder:text-faint focus:border-amber-soft"
        />
      </label>

      <div>
        <p className="mb-1 font-mono text-caption text-faint">
          封面图（可留空；带封面的主题会在列表中显示缩略图）
        </p>
        <MediaField
          value={cover}
          onChange={(v) => setCover({ ...v, kind: "image" })}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-caption text-faint">
            正文（支持 Markdown）
          </span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-secondary hover:border-amber-soft hover:text-amber"
          >
            {preview ? "继续编辑" : "预览"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-40 rounded-md border border-border-subtle bg-surface p-4">
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <p className="text-small text-faint">（暂无内容）</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder={"支持 Markdown：## 标题、- 列表、**加粗**、| 表格 |"}
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2.5 font-mono text-small leading-relaxed text-primary placeholder:text-faint focus:border-amber-soft"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !title.trim() || !content.trim()}
          className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "发布中…" : "发布主题"}
        </button>
        <Link
          href={`/forum/${boardSlug}`}
          className="rounded-md border border-border-subtle px-5 py-2.5 text-small text-secondary hover:border-amber-soft hover:text-primary"
        >
          取消
        </Link>
        {msg && <span className="text-caption text-danger">{msg}</span>}
      </div>
    </div>
  );
}
