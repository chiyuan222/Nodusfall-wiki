"use client";

import type { ReactNode } from "react";
import type { MediaSlot } from "@/lib/world-content";

/** 内容编辑器共享控件（/admin/world 与 /admin/home 共用） */

export function Field({
  label,
  value,
  onChange,
  textarea = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-caption text-faint">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft"
        />
      )}
    </label>
  );
}

export function MediaField({
  value,
  onChange,
}: {
  value: MediaSlot;
  onChange: (v: MediaSlot) => void;
}) {
  const kind = value.kind ?? "image";
  return (
    <div className="rounded-md border border-border-subtle p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-mono text-caption text-faint">媒体类型</span>
          <select
            value={kind}
            onChange={(e) => onChange({ ...value, kind: e.target.value as "image" | "video" })}
            className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary"
          >
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <Field
            label={`${kind === "video" ? "视频" : "图片"}路径（留空 = 占位画框；文件放进 public/content/ 后填如 /content/xxx.webp）`}
            value={value.src}
            onChange={(src) => onChange({ ...value, src })}
            placeholder={kind === "video" ? "/content/pv.mp4" : "/content/example.webp"}
          />
        </div>
      </div>
      {kind === "video" && (
        <div className="mt-2">
          <Field
            label="视频封面图 poster（可留空，浏览器取首帧）"
            value={value.poster}
            onChange={(poster) => onChange({ ...value, poster })}
            placeholder="/content/pv-cover.webp"
          />
        </div>
      )}
      <div className="mt-2">
        <Field
          label="替代文本 alt"
          value={value.alt}
          onChange={(alt) => onChange({ ...value, alt })}
        />
      </div>
      {value.src.trim() && kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- 编辑器内预览管理员自填路径
        <img
          src={value.src}
          alt={value.alt || "预览"}
          className="mt-3 max-h-40 rounded-md border border-border-subtle object-cover"
        />
      )}
      {value.src.trim() && kind === "video" && (
        <video
          src={value.src}
          poster={value.poster || undefined}
          controls
          playsInline
          preload="metadata"
          className="mt-3 max-h-40 rounded-md border border-border-subtle"
        />
      )}
    </div>
  );
}

export function RowActions({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
}) {
  const btn =
    "rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-30";
  return (
    <span className="flex items-center gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="上移">
        ↑
      </button>
      <button type="button" className={btn} disabled={index === length - 1} onClick={() => onMove(index, index + 1)} aria-label="下移">
        ↓
      </button>
      {onRemove && (
        <button type="button" className={`${btn} text-danger`} onClick={() => onRemove(index)} aria-label="删除">
          删
        </button>
      )}
    </span>
  );
}

/** 泛型数组条目卡片 */
export function ItemCard({
  title,
  index,
  length,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  length: number;
  onMove: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-caption text-faint">{title}</span>
        <RowActions index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export const addBtnCls =
  "rounded-md border border-dashed border-border-subtle px-4 py-2 text-caption text-faint hover:border-amber-soft hover:text-amber";
