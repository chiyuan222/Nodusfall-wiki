"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  siteApi,
  type FloatingWindowConfig,
  type FloatingWindows,
  type SiteSections,
} from "@/lib/api";
import { invalidateSiteSections } from "@/lib/site-config";
import { useMe, isAdminRole, hasPermission } from "@/lib/me";

/**
 * 站点设置管理（契约 PR #70）：
 * ① 内容分区显示开关（禁用分区对外显示「维护中」、导航隐藏入口）
 * ② 论坛页左右漂浮引流窗（图片 + 跳转链接 + 启用开关，站长贴二维码引流）
 * 权限：owner 或 manage_cms。保存后 invalidateSiteSections() 全站即时生效。
 */

const SECTION_META: { key: keyof SiteSections; label: string; hint: string }[] = [
  { key: "home", label: "首页", hint: "关闭时首页显示维护横幅（入口保留）" },
  { key: "world", label: "总览", hint: "游戏概览与世界观设定页" },
  { key: "wiki", label: "Wiki", hint: "词条库" },
  { key: "guides", label: "攻略", hint: "玩家攻略" },
  { key: "forum", label: "论坛", hint: "板块讨论区" },
  { key: "videos", label: "相关视频", hint: "视频导航页" },
];

const EMPTY_FLOAT: FloatingWindowConfig = {
  enabled: false,
  imageUrl: null,
  linkUrl: null,
};

const inputCls =
  "w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none";

function FloatWindowForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: FloatingWindowConfig;
  onChange: (v: FloatingWindowConfig) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-border-subtle bg-surface p-4">
      <legend className="px-1 text-small font-medium text-primary">{title}</legend>
      <label className="flex items-center gap-2 text-small text-secondary">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="accent-amber"
        />
        启用该侧漂浮窗
      </label>
      <label className="block space-y-1">
        <span className="text-caption text-faint">图片地址（二维码/友情站 banner）</span>
        <input
          value={value.imageUrl ?? ""}
          onChange={(e) => onChange({ ...value, imageUrl: e.target.value || null })}
          placeholder="https://…"
          className={inputCls}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-caption text-faint">点击跳转链接（可选，新窗口打开）</span>
        <input
          value={value.linkUrl ?? ""}
          onChange={(e) => onChange({ ...value, linkUrl: e.target.value || null })}
          placeholder="https://…（QQ 群链接、友情站地址等）"
          className={inputCls}
        />
      </label>
    </fieldset>
  );
}

export function SiteConfigManager() {
  const { me, pending } = useMe();
  const [sections, setSections] = useState<SiteSections | null>(null);
  const [windows, setWindows] = useState<FloatingWindows>({
    left: EMPTY_FLOAT,
    right: EMPTY_FLOAT,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [toast, setToast] = useState("");

  const allowed =
    !!me && (isAdminRole(me.role) || hasPermission(me, "manage_cms"));

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    Promise.all([siteApi.sections(), siteApi.floatingWindows()])
      .then(([s, w]) => {
        setSections(s);
        setWindows({
          left: w.left ?? EMPTY_FLOAT,
          right: w.right ?? EMPTY_FLOAT,
        });
      })
      .catch(() => setErr("站点配置加载失败，后端服务可能尚未上线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

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
        当前账号无站点设置权限（需站长或 manage_cms 开关）。
      </p>
    );
  }

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const toggleSection = (key: keyof SiteSections) => {
    if (!sections || savingKey) return;
    const next = { ...sections, [key]: !sections[key] };
    setSections(next); // 乐观更新
    setSavingKey(key);
    siteApi
      .updateSections({ [key]: next[key] })
      .then((saved) => {
        setSections((prev) => ({ ...(prev ?? next), ...saved }));
        invalidateSiteSections();
        flash(`「${SECTION_META.find((s) => s.key === key)?.label}」已${next[key] ? "开启" : "关闭"}`);
      })
      .catch((e: { problem?: { detail?: string } }) => {
        setSections(sections); // 回滚
        setErr(e?.problem?.detail ?? "保存失败，请稍后重试。");
      })
      .finally(() => setSavingKey(""));
  };

  const saveWindows = () => {
    if (savingKey) return;
    setSavingKey("windows");
    siteApi
      .updateFloatingWindows(windows)
      .then((saved) => {
        setWindows({
          left: saved.left ?? EMPTY_FLOAT,
          right: saved.right ?? EMPTY_FLOAT,
        });
        flash("漂浮窗配置已保存，论坛页即时生效");
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setErr(e?.problem?.detail ?? "保存失败，请稍后重试。"),
      )
      .finally(() => setSavingKey(""));
  };

  if (loading) {
    return <p className="p-6 text-center text-small text-faint">载入中…</p>;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <p role="status" className="rounded-md border border-amber-soft/60 bg-raised px-4 py-2 text-small text-amber">
          {toast}
        </p>
      )}
      {err && (
        <p role="alert" className="rounded-md border border-danger/40 bg-surface px-4 py-2 text-small text-danger">
          {err}
        </p>
      )}

      {/* 分区开关 */}
      <section className="rounded-md border border-border-subtle bg-surface">
        <header className="border-b border-border-subtle px-5 py-3">
          <h2 className="text-body font-semibold text-primary">内容分区显示开关</h2>
          <p className="mt-1 text-caption text-faint">
            关闭后：导航隐藏入口，直接访问该分区显示「维护中」，其余分区不受影响
          </p>
        </header>
        <ul className="divide-y divide-border-subtle">
          {SECTION_META.map((s) => (
            <li key={s.key} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 grow">
                <p className="text-small font-medium text-primary">{s.label}</p>
                <p className="text-caption text-faint">{s.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sections?.[s.key] ?? true}
                aria-label={`${s.label}显示开关`}
                disabled={savingKey === s.key}
                onClick={() => toggleSection(s.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-fast disabled:opacity-40 ${
                  sections?.[s.key] ? "bg-amber" : "bg-raised border border-border-subtle"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-all duration-fast ${
                    sections?.[s.key] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 漂浮窗配置 */}
      <section className="space-y-3">
        <header>
          <h2 className="text-body font-semibold text-primary">论坛漂浮引流窗</h2>
          <p className="mt-1 text-caption text-faint">
            显示在论坛页左右两侧（仅宽屏），访客可关闭；换图后对已关闭的访客会重新出现
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FloatWindowForm
            title="左侧漂浮窗"
            value={windows.left}
            onChange={(v) => setWindows({ ...windows, left: v })}
          />
          <FloatWindowForm
            title="右侧漂浮窗"
            value={windows.right}
            onChange={(v) => setWindows({ ...windows, right: v })}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={savingKey === "windows"}
            onClick={saveWindows}
            className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
          >
            {savingKey === "windows" ? "保存中…" : "保存漂浮窗配置"}
          </button>
        </div>
      </section>
    </div>
  );
}
