"use client";

import { useState } from "react";
import { videoApi, type VideoKind, type VideoPlatform } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { useMe, hasPermission, isAdminRole } from "@/lib/me";

/**
 * 「＋ 分享视频」按钮 + 表单弹窗（POST /videos，契约 PR #121）。
 * 可见：admin/owner、视频小编/版主、manage_video_board 或 videoShareGranted。
 * 提交成功后触发 onShared 让列表刷新。
 */

const KIND_LABEL: Record<VideoKind, string> = {
  official: "官方视频",
  analysis: "考究杂谈",
  gameplay: "实况攻略",
};

const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  bilibili: "B 站",
  douyin: "抖音",
  youtube: "YouTube",
  other: "其他",
};

const inputCls =
  "w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft";
const labelCls = "mb-1 block font-mono text-caption text-faint";

export function ShareVideoEntry({ onShared }: { onShared?: () => void }) {
  const { me, pending } = useMe();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VideoKind>("gameplay");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<VideoPlatform>("bilibili");
  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (pending || !me) return null;
  const ok =
    isAdminRole(me.role) ||
    me.role === "video_editor" ||
    me.role === "video_moderator" ||
    hasPermission(me, "manage_video_board") ||
    me.videoShareGranted === true;
  if (!ok) return null;

  const submit = () => {
    if (busy) return;
    if (!title.trim()) return setMsg("请填写标题。");
    if (!/^https?:\/\/.+/.test(url.trim()))
      return setMsg("请填写合法的视频链接（http/https）。");
    setBusy(true);
    setMsg("");
    videoApi
      .share({
        kind,
        title: title.trim(),
        url: url.trim(),
        platform,
        coverImage: coverImage.trim() || null,
        description: description.trim() || null,
      })
      .then(() => {
        setOpen(false);
        setTitle("");
        setUrl("");
        setCoverImage("");
        setDescription("");
        if (onShared) onShared();
        else window.location.reload();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403)
          setMsg("当前账号没有视频分享资格，可向站长申请开通。");
        else if (e instanceof ApiError)
          setMsg(`分享失败：${e.problem.detail ?? e.problem.title}`);
        else setMsg("无法连接后端。");
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMsg("");
        }}
        className="rounded-md border border-amber-soft px-4 py-1.5 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
      >
        ＋ 分享视频
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="分享视频"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-md border border-border-subtle bg-surface p-6">
            <h3 className="font-serif text-h3 font-semibold">分享视频</h3>
            <p className="text-caption text-faint">
              仅收藏外链跳转，不搬运、不上传；视频版权归原作者与平台所有。
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelCls}>分区</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as VideoKind)}
                  className={inputCls}
                >
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>平台</span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as VideoPlatform)}
                  className={inputCls}
                >
                  {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelCls}>标题（≤200 字）</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>视频链接</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>封面图链接（可选）</span>
              <input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>简介（可选，≤500 字）</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className={inputCls}
              />
            </label>

            {msg && (
              <p role="alert" className="text-caption text-danger">
                {msg}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "提交中…" : "分享"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
