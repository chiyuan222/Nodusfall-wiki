"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { request, type ListResult } from "@/lib/api-client";
import { useMe } from "@/lib/me";

/**
 * 「我的草稿」入口（权限体系 v2 批次，契约 PR #133）。
 * - Wiki：GET /wiki/pages?status=draft&mine=true；攻略：GET /guides?status=draft&mine=true
 * - 仅登录用户渲染；点击展开下拉面板，草稿卡片显示标题与更新时间，点击进入编辑续写
 * - 空态「暂无草稿」；接口失败静默为空态（不暴露权限细节）
 */

interface DraftItem {
  slug: string;
  title: string;
  updatedAt: string;
}

export function MyDraftsEntry({ kind }: { kind: "wiki" | "guide" }) {
  const { me, pending } = useMe();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isWiki = kind === "wiki";
  const listPath = isWiki ? "/wiki/pages" : "/guides";
  const editPath = (slug: string) =>
    isWiki ? `/wiki/${slug}/edit` : `/guides/${slug}/edit`;

  const load = useCallback(() => {
    setLoading(true);
    request<ListResult<DraftItem>>(listPath, {
      query: { status: "draft", mine: true, perPage: 20 },
    })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [listPath]);

  // 点击外部收起
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (pending || !me) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && items === null) load();
        }}
        className="rounded-md border border-border-subtle px-4 py-1.5 text-small text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
      >
        我的草稿{items && items.length > 0 ? `（${items.length}）` : ""}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-md border border-border-subtle bg-surface p-3 shadow-card">
          {loading || items === null ? (
            <p className="px-2 py-6 text-center text-small text-faint">载入中…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-small text-faint">
              暂无草稿。编辑器中点「保存草稿」即可在此找到。
            </p>
          ) : (
            <ol className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={editPath(d.slug)}
                    onClick={() => setOpen(false)}
                    className="block rounded-sm px-3 py-2 transition-colors duration-fast hover:bg-raised"
                  >
                    <span className="block truncate text-small font-medium text-primary">
                      {d.title || "未命名草稿"}
                    </span>
                    <span className="mt-0.5 block font-mono text-caption text-faint">
                      更新于{" "}
                      {new Date(d.updatedAt).toLocaleString("zh-CN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
