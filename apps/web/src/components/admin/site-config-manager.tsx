"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  siteApi,
  type AppearanceHeading,
  type FloatingWindowConfig,
  type FloatingWindows,
  type SiteSections,
} from "@/lib/api";
import { invalidateSiteSections } from "@/lib/site-config";
import { invalidateAppearance } from "@/lib/appearance";
import { useMe, isAdminRole, hasPermission } from "@/lib/me";

/**
 * 站点设置管理（契约 PR #70 / #101）：
 * ① 内容分区显示开关（禁用分区对外显示「维护中」、导航隐藏入口）
 * ② 论坛页左右漂浮引流窗（图片 + 跳转链接 + 启用开关，站长贴二维码引流）
 * ③ 全站标题外观（颜色调色盘 / 字体族 / 字重，null=跟随主题默认）
 * 权限：owner 或 manage_cms。保存后 invalidate 全站即时生效。
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

/** 标题外观（契约 PR #101）：字体族 / 字重下拉选项，值 null=跟随主题默认 */
const FONT_OPTIONS: {
  value: NonNullable<AppearanceHeading["fontFamily"]>;
  label: string;
}[] = [
  { value: "serif", label: "衬线宋体系（主题默认）" },
  { value: "sans", label: "无衬线黑体系" },
  { value: "kaiti", label: "楷体系" },
];

const WEIGHT_OPTIONS: {
  value: NonNullable<AppearanceHeading["fontWeight"]>;
  label: string;
}[] = [
  { value: 400, label: "常规 400" },
  { value: 500, label: "中等 500" },
  { value: 600, label: "半粗 600" },
  { value: 700, label: "粗 700" },
  { value: 800, label: "特粗 800" },
];

const DEFAULT_HEADING_COLOR = "#d9a441"; // 调色盘起点，仅作未设置时的取色初始值

function resetBtnCls(disabled: boolean) {
  return `shrink-0 rounded-md border border-border-subtle px-3 py-1.5 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber disabled:opacity-40 ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;
}

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
  const [heading, setHeading] = useState<AppearanceHeading>({
    color: null,
    fontFamily: null,
    fontWeight: null,
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
    Promise.all([siteApi.sections(), siteApi.floatingWindows(), siteApi.appearance()])
      .then(([s, w, a]) => {
        setSections(s);
        setWindows({
          left: w.left ?? EMPTY_FLOAT,
          right: w.right ?? EMPTY_FLOAT,
        });
        setHeading({
          color: a.heading?.color ?? null,
          fontFamily: a.heading?.fontFamily ?? null,
          fontWeight: a.heading?.fontWeight ?? null,
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

  const saveHeading = () => {
    if (savingKey) return;
    setSavingKey("heading");
    // 全量回传三字段；null = 恢复主题默认（契约部分更新语义，显式 null 生效）
    siteApi
      .updateAppearance({ heading })
      .then((saved) => {
        setHeading({
          color: saved.heading?.color ?? null,
          fontFamily: saved.heading?.fontFamily ?? null,
          fontWeight: saved.heading?.fontWeight ?? null,
        });
        void invalidateAppearance(); // 全站标题即时生效
        flash("标题外观已保存，全站即时生效");
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setErr(e?.problem?.detail ?? "保存失败，请检查颜色格式（#RRGGBB）。"),
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

      {/* 标题外观（契约 PR #101） */}
      <section className="rounded-md border border-border-subtle bg-surface">
        <header className="border-b border-border-subtle px-5 py-3">
          <h2 className="text-body font-semibold text-primary">全站标题外观</h2>
          <p className="mt-1 text-caption text-faint">
            作用于页面大标题、卡片标题、正文小节标题等主要标题；正文不受影响。「恢复默认」即跟随当前美术主题
          </p>
        </header>
        <div className="space-y-5 px-5 py-4">
          {/* 颜色：调色盘 + hex 联动 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 grow">
              <p className="text-small font-medium text-primary">标题颜色</p>
              <p className="text-caption text-faint">
                {heading.color ? `当前 ${heading.color}` : "跟随主题默认"}
              </p>
            </div>
            <input
              type="color"
              aria-label="标题颜色调色盘"
              value={heading.color ?? DEFAULT_HEADING_COLOR}
              onChange={(e) => setHeading((h) => ({ ...h, color: e.target.value }))}
              className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-border-subtle bg-page p-1"
            />
            <input
              value={heading.color ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setHeading((h) => ({ ...h, color: v === "" ? null : v }));
              }}
              placeholder="#RRGGBB"
              aria-label="标题颜色 hex 值"
              className={`${inputCls} w-28 font-mono`}
            />
            <button
              type="button"
              disabled={heading.color === null}
              onClick={() => setHeading((h) => ({ ...h, color: null }))}
              className={resetBtnCls(heading.color === null)}
            >
              恢复默认
            </button>
          </div>

          {/* 字体族 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 grow">
              <p className="text-small font-medium text-primary">标题字体</p>
              <p className="text-caption text-faint">
                {heading.fontFamily
                  ? FONT_OPTIONS.find((f) => f.value === heading.fontFamily)?.label
                  : "跟随主题默认（衬线宋体系）"}
              </p>
            </div>
            <select
              value={heading.fontFamily ?? ""}
              onChange={(e) =>
                setHeading((h) => ({
                  ...h,
                  fontFamily: (e.target.value ||
                    null) as AppearanceHeading["fontFamily"],
                }))
              }
              aria-label="标题字体族"
              className={`${inputCls} w-auto`}
            >
              <option value="">跟随主题默认</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={heading.fontFamily === null}
              onClick={() => setHeading((h) => ({ ...h, fontFamily: null }))}
              className={resetBtnCls(heading.fontFamily === null)}
            >
              恢复默认
            </button>
          </div>

          {/* 字重 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 grow">
              <p className="text-small font-medium text-primary">标题字重</p>
              <p className="text-caption text-faint">
                {heading.fontWeight != null
                  ? WEIGHT_OPTIONS.find((w) => w.value === heading.fontWeight)?.label
                  : "跟随主题默认（各级标题原有字重）"}
              </p>
            </div>
            <select
              value={heading.fontWeight ?? ""}
              onChange={(e) =>
                setHeading((h) => ({
                  ...h,
                  fontWeight: (e.target.value === ""
                    ? null
                    : Number(e.target.value)) as AppearanceHeading["fontWeight"],
                }))
              }
              aria-label="标题字重"
              className={`${inputCls} w-auto`}
            >
              <option value="">跟随主题默认</option>
              {WEIGHT_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={heading.fontWeight === null}
              onClick={() => setHeading((h) => ({ ...h, fontWeight: null }))}
              className={resetBtnCls(heading.fontWeight === null)}
            >
              恢复默认
            </button>
          </div>

          <div className="flex justify-end border-t border-border-subtle pt-4">
            <button
              type="button"
              disabled={savingKey === "heading"}
              onClick={saveHeading}
              className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
            >
              {savingKey === "heading" ? "保存中…" : "保存标题外观"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
