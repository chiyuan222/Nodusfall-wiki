"use client";

import { useCallback, useEffect, useState } from "react";
import { videoApi, type VideoEntry, type VideoKind, type VideoPlatform } from "@/lib/api";

/**
 * 相关视频导航（契约 PR #67）：三个分区 Tab + 视频卡片网格。
 * 卡片 = 封面 + 标题 + 平台徽标 + 简介，点击整卡外链新窗口打开（noopener）。
 * 后端未上线时显示提示，不使用 mock。
 */

export const VIDEO_KINDS: { key: VideoKind; label: string; desc: string }[] = [
  { key: "official", label: "官方视频", desc: "官方发布的 PV、前瞻与开发动态" },
  { key: "analysis", label: "考究杂谈", desc: "世界观考据、设定解析与剧情杂谈" },
  { key: "gameplay", label: "实况攻略", desc: "实机演示、流程实况与玩法攻略" },
];

export const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  bilibili: "B站",
  douyin: "抖音",
  youtube: "YouTube",
  other: "外链",
};

function VideoCard({ v }: { v: VideoEntry }) {
  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface transition-colors duration-fast hover:border-amber-soft"
    >
      {/* 封面 16:9；无封面时显示播放符占位 */}
      <span className="relative block aspect-video w-full overflow-hidden bg-raised">
        {v.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外链封面，尺寸未知
          <img
            src={v.coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          />
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
              <circle cx="9" cy="9" r="7" />
              <path d="M7.5 6.2v5.6l4.6-2.8-4.6-2.8Z" fill="currentColor" stroke="none" />
            </svg>
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-sm bg-page/80 px-1.5 py-0.5 font-mono text-caption text-secondary backdrop-blur">
          {PLATFORM_LABEL[v.platform]}
        </span>
      </span>
      <span className="flex grow flex-col gap-1 p-3">
        <span className="line-clamp-2 text-small font-medium text-primary group-hover:text-amber">
          {v.title}
        </span>
        {v.description && (
          <span className="line-clamp-2 text-caption text-secondary">
            {v.description}
          </span>
        )}
      </span>
    </a>
  );
}

export function VideoHub() {
  const [kind, setKind] = useState<VideoKind>("official");
  const [items, setItems] = useState<VideoEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback((k: VideoKind, p: number) => {
    setLoading(true);
    setErr("");
    videoApi
      .list(k, p, 24)
      .then((r) => {
        setItems(r.data);
        setHasMore(r.pagination.hasMore);
      })
      .catch(() => setErr("视频列表加载失败，后端服务可能尚未上线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(kind, page);
  }, [kind, page, load]);

  const active = VIDEO_KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-5">
      {/* 分区 Tab */}
      <div
        role="tablist"
        aria-label="视频分区"
        className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {VIDEO_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={kind === k.key}
            onClick={() => {
              setKind(k.key);
              setPage(1);
            }}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              kind === k.key
                ? "bg-amber font-medium text-amber-fg"
                : "text-secondary hover:text-amber"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-caption text-faint">{active.desc}</p>

      {/* 卡片网格 */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-md border border-border-subtle bg-surface"
            >
              <div className="aspect-video w-full animate-pulse bg-raised" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded-sm bg-raised" />
                <div className="h-3 w-1/2 animate-pulse rounded-sm bg-raised" />
              </div>
            </div>
          ))}
        </div>
      ) : err ? (
        <p role="alert" className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
          {err}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
          该分区暂无视频，管理员收录后会显示在这里。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface px-5 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
          >
            ← 上一页
          </button>
          <span className="font-mono text-caption text-faint">第 {page} 页</span>
          <button
            type="button"
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
          >
            下一页 →
          </button>
        </div>
      )}

      <p className="text-caption text-faint">
        所有视频均跳转至原平台播放，版权归原作者所有；如收录内容侵权，请联系站长下架。
      </p>
    </div>
  );
}
