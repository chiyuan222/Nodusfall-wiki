"use client";

import { useRef, useState, type ReactNode } from "react";
import type { MediaSlot } from "@/lib/world-content";
import { API_BASE_URL } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  /** POST /uploads（契约）：multipart 表单，成功后将返回的 url 回填到 src */
  const upload = async (file: File) => {
    const token = getAccessToken();
    if (!token) {
      setUploadMsg("未登录：请先在 /login 登录后再上传，或手动把文件放进 public/content/ 后填写路径。");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.status === 401) {
        setUploadMsg("登录已失效，请重新登录后再上传。");
        return;
      }
      if (!res.ok) {
        setUploadMsg(`上传失败（HTTP ${res.status}）。也可手动放入 public/content/ 后填写路径。`);
        return;
      }
      const json = (await res.json()) as { data?: { url?: string; mimeType?: string } };
      const url = json.data?.url ?? "";
      if (!url) {
        setUploadMsg("上传响应缺少 url 字段，请检查后端实现。");
        return;
      }
      // 依据返回的 mimeType 自动切换媒体类型
      const mime = json.data?.mimeType ?? "";
      const nextKind = mime.startsWith("video/") ? "video" : kind;
      onChange({ ...value, kind: nextKind, src: url });
      setUploadMsg("上传成功，路径已自动填入。");
    } catch {
      setUploadMsg("无法连接后端（POST /uploads 未就绪？）。可手动放入 public/content/ 后填写路径。");
    } finally {
      setUploading(false);
    }
  };

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
            label={`${kind === "video" ? "视频" : "图片"}路径（留空 = 占位画框；可点下方按钮上传，或把文件放进 public/content/ 后填如 /content/xxx.webp）`}
            value={value.src}
            onChange={(src) => onChange({ ...value, src })}
            placeholder={kind === "video" ? "/content/pv.mp4" : "/content/example.webp"}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-border-subtle bg-raised px-3 py-1.5 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber disabled:opacity-40"
        >
          {uploading ? "上传中…" : "上传文件（POST /uploads）"}
        </button>
        {uploadMsg && <span className="text-caption text-secondary">{uploadMsg}</span>}
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
