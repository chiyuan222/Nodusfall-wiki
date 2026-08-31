"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  emptyHomeMedia,
  HOME_SECTION_LABEL,
  type HomePageContent,
  type HomeSectionId,
} from "@/lib/home-content";
import {
  addBtnCls,
  Field,
  ItemCard,
  MediaField,
  RowActions,
} from "./editor-controls";

/**
 * 首页内容编辑器（临时本地方案，待后端 CMS 契约冻结后替换为接口读写）
 * 工作流：编辑 → 「下载 JSON」→ 替换 apps/web/public/content/home-page.json 并提交。
 */

type Draft = HomePageContent;

export function HomeEditor() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openSection, setOpenSection] = useState<HomeSectionId | null>("hero");

  const load = () => {
    setError("");
    fetch("/content/home-page.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Draft>;
      })
      .then((data) => {
        setDraft(data);
        setDirty(false);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, []);

  const mutate = (fn: (d: Draft) => void) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const listOp = <T,>(
    get: (d: Draft) => T[],
    op: "move" | "remove" | "add",
    payload: { index?: number; to?: number; item?: T },
  ) =>
    mutate((d) => {
      const arr = get(d);
      if (op === "move" && payload.index !== undefined && payload.to !== undefined) {
        const [x] = arr.splice(payload.index, 1);
        if (x !== undefined) arr.splice(payload.to, 0, x);
      } else if (op === "remove" && payload.index !== undefined) {
        arr.splice(payload.index, 1);
      } else if (op === "add" && payload.item !== undefined) {
        arr.push(payload.item);
      }
    });

  const moveSection = (from: number, to: number) =>
    mutate((d) => {
      const [x] = d.sections.splice(from, 1);
      if (x) d.sections.splice(to, 0, x);
    });

  const toggleHidden = (id: HomeSectionId) =>
    mutate((d) => {
      d[id].hidden = !d[id].hidden;
    });

  const exportJson = () => JSON.stringify(draft, null, 2);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "home-page.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard.writeText(exportJson()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-h1 font-semibold">内容配置读取失败</h1>
        <p className="mt-3 text-small text-secondary">
          无法加载 <code className="font-mono text-amber">/content/home-page.json</code>（{error}）
        </p>
        <button type="button" onClick={load} className="mt-6 rounded-md bg-amber px-6 py-2 text-small font-medium text-amber-fg">
          重试
        </button>
      </div>
    );
  }

  if (!draft) {
    return <p className="py-16 text-center text-small text-faint">正在载入内容配置…</p>;
  }

  return (
    <div className="py-8">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">首页内容管理</h1>
        {dirty && (
          <span className="rounded-sm border border-amber-soft px-2 py-0.5 text-caption text-amber">
            有未导出的修改
          </span>
        )}
        <span className="grow" />
        <Link
          href="/admin/world"
          className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
        >
          总览页内容管理 →
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
        >
          预览首页 ↗
        </a>
        <button type="button" onClick={load} className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary">
          重新载入
        </button>
        <button type="button" onClick={copy} className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary">
          {copied ? "已复制 ✓" : "复制 JSON"}
        </button>
        <button type="button" onClick={download} className="rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg hover:opacity-90">
          下载 JSON
        </button>
      </div>

      <div className="mt-4 rounded-md border border-border-subtle bg-surface p-4 text-small text-secondary">
        <p>
          在此处编辑首页横幅、公告条与入口卡 → 点击「下载 JSON」→ 替换仓库中的
          <code className="font-mono text-amber"> apps/web/public/content/home-page.json </code>
          并提交。图片/视频请先把文件放入
          <code className="font-mono text-amber"> apps/web/public/content/ </code>
          再在此填写路径。
        </p>
      </div>

      {/* 板块列表 */}
      <ol className="mt-8 space-y-4">
        {draft.sections.map((id, i) => {
          const hidden = !!draft[id].hidden;
          const open = openSection === id;
          return (
            <li
              key={id}
              className={`rounded-md border bg-surface ${hidden ? "border-dashed border-border-subtle opacity-60" : "border-border-subtle"}`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-caption text-amber">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenSection(open ? null : id)}
                  className="text-body font-medium text-primary hover:text-amber"
                  aria-expanded={open}
                >
                  {HOME_SECTION_LABEL[id]}
                  {hidden && <span className="ml-2 text-caption text-faint">（已隐藏）</span>}
                </button>
                <span className="grow" />
                <RowActions index={i} length={draft.sections.length} onMove={moveSection} />
                <button
                  type="button"
                  onClick={() => toggleHidden(id)}
                  className="rounded-sm border border-border-subtle px-2 py-0.5 text-caption text-secondary hover:border-amber-soft hover:text-amber"
                >
                  {hidden ? "显示" : "隐藏"}
                </button>
              </div>

              {open && (
                <div className="space-y-4 border-t border-border-subtle p-4">
                  {id === "hero" && (
                    <>
                      <Field label="眉题 kicker" value={draft.hero.kicker} onChange={(v) => mutate((d) => void (d.hero.kicker = v))} />
                      <Field label="主标题" value={draft.hero.title} onChange={(v) => mutate((d) => void (d.hero.title = v))} />
                      <Field label="导语" value={draft.hero.lead} textarea onChange={(v) => mutate((d) => void (d.hero.lead = v))} />
                      <MediaField value={draft.hero.media} onChange={(v) => mutate((d) => void (d.hero.media = v))} />
                      <div>
                        <p className="mb-2 font-mono text-caption text-faint">按钮 ctas</p>
                        <div className="space-y-3">
                          {draft.hero.ctas.map((cta, j) => (
                            <ItemCard
                              key={j}
                              title={`ctas[${j}]`}
                              index={j}
                              length={draft.hero.ctas.length}
                              onMove={(f, t) => listOp((d) => d.hero.ctas, "move", { index: f, to: t })}
                              onRemove={(x) => listOp((d) => d.hero.ctas, "remove", { index: x })}
                            >
                              <div className="grid gap-3 md:grid-cols-3">
                                <Field label="文字" value={cta.label} onChange={(v) => mutate((d) => void (d.hero.ctas[j]!.label = v))} />
                                <Field label="链接（站内 /）" value={cta.href} onChange={(v) => mutate((d) => void (d.hero.ctas[j]!.href = v))} />
                                <label className="block">
                                  <span className="mb-1 block font-mono text-caption text-faint">样式</span>
                                  <select
                                    value={cta.style}
                                    onChange={(e) => mutate((d) => void (d.hero.ctas[j]!.style = e.target.value as "primary" | "ghost"))}
                                    className="w-full rounded-md border border-border-subtle bg-raised px-3 py-2 text-small text-primary"
                                  >
                                    <option value="primary">primary 实心</option>
                                    <option value="ghost">ghost 描边</option>
                                  </select>
                                </label>
                              </div>
                            </ItemCard>
                          ))}
                        </div>
                        <button type="button" className={`${addBtnCls} mt-3`} onClick={() => listOp((d) => d.hero.ctas, "add", { item: { label: "", href: "", style: "ghost" } })}>
                          + 添加按钮
                        </button>
                      </div>
                    </>
                  )}

                  {id === "notice" && (
                    <>
                      <p className="text-caption text-faint">
                        公告条显示在首页最顶部；文字与链接都留空时公告条自动不渲染。
                      </p>
                      <Field label="公告文字" value={draft.notice.text} textarea onChange={(v) => mutate((d) => void (d.notice.text = v))} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="链接文字（可留空）" value={draft.notice.linkLabel} onChange={(v) => mutate((d) => void (d.notice.linkLabel = v))} />
                        <Field label="链接地址（可留空）" value={draft.notice.linkHref} onChange={(v) => mutate((d) => void (d.notice.linkHref = v))} />
                      </div>
                    </>
                  )}

                  {id === "digest" && (
                    <>
                      <p className="text-caption text-faint">
                        两栏快报显示在首屏下方：左栏最新动态、右栏精华推荐。条目为空时前台显示虚线空态框。
                      </p>
                      {(["latest", "featured"] as const).map((key) => (
                        <div key={key} className="rounded-md border border-border-subtle p-4">
                          <p className="mb-3 font-mono text-caption uppercase tracking-widest text-amber">
                            {key === "latest" ? "左栏 · 最新动态" : "右栏 · 精华推荐"}
                          </p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field
                              label="栏目标题"
                              value={draft.digest[key].title}
                              onChange={(v) => mutate((d) => void (d.digest[key].title = v))}
                            />
                            <Field
                              label="空态提示文字"
                              value={draft.digest[key].emptyText}
                              onChange={(v) => mutate((d) => void (d.digest[key].emptyText = v))}
                            />
                          </div>
                          <div className="mt-3 space-y-3">
                            {draft.digest[key].items.map((item, j) => (
                              <ItemCard
                                key={j}
                                title={`items[${j}]`}
                                index={j}
                                length={draft.digest[key].items.length}
                                onMove={(f, t) => listOp((d) => d.digest[key].items, "move", { index: f, to: t })}
                                onRemove={(x) => listOp((d) => d.digest[key].items, "remove", { index: x })}
                              >
                                <div className="grid gap-3 md:grid-cols-3">
                                  <Field label="标题" value={item.title} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.title = v))} />
                                  <Field label="链接（站内 / 或外链）" value={item.url} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.url = v))} />
                                  <div className="grid grid-cols-2 gap-3">
                                    <Field label="标签（可留空）" value={item.tag} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.tag = v))} />
                                    <Field label="日期（可留空）" value={item.date} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.date = v))} />
                                  </div>
                                  <div className="md:col-span-3">
                                    <Field label="简介（可留空）" value={item.excerpt} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.excerpt = v))} />
                                  </div>
                                  <div className="md:col-span-3">
                                    <Field label="缩略图路径（可留空，显示在条目右侧）" value={item.image} onChange={(v) => mutate((d) => void (d.digest[key].items[j]!.image = v))} placeholder="/content/thumb.webp" />
                                  </div>
                                </div>
                              </ItemCard>
                            ))}
                          </div>
                          <button
                            type="button"
                            className={`${addBtnCls} mt-3`}
                            onClick={() =>
                              listOp((d) => d.digest[key].items, "add", {
                                item: { date: "", tag: "", title: "", url: "", excerpt: "", image: "" },
                              })
                            }
                          >
                            + 添加条目
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {id === "entries" && (
                    <>
                      <Field label="板块标题" value={draft.entries.title} onChange={(v) => mutate((d) => void (d.entries.title = v))} />
                      <div className="space-y-3">
                        {draft.entries.cards.map((card, j) => (
                          <ItemCard
                            key={j}
                            title={`cards[${j}]`}
                            index={j}
                            length={draft.entries.cards.length}
                            onMove={(f, t) => listOp((d) => d.entries.cards, "move", { index: f, to: t })}
                            onRemove={(x) => listOp((d) => d.entries.cards, "remove", { index: x })}
                          >
                            <div className="grid gap-3 md:grid-cols-3">
                              <Field label="名称" value={card.title} onChange={(v) => mutate((d) => void (d.entries.cards[j]!.title = v))} />
                              <Field label="链接（站内 /）" value={card.href} onChange={(v) => mutate((d) => void (d.entries.cards[j]!.href = v))} />
                              <div className="md:col-span-3">
                                <Field label="简介" value={card.desc} textarea onChange={(v) => mutate((d) => void (d.entries.cards[j]!.desc = v))} />
                              </div>
                            </div>
                            <MediaField value={card.media} onChange={(v) => mutate((d) => void (d.entries.cards[j]!.media = v))} />
                          </ItemCard>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`${addBtnCls} mt-3`}
                        onClick={() =>
                          listOp((d) => d.entries.cards, "add", {
                            item: { title: "", desc: "", href: "/", media: emptyHomeMedia() },
                          })
                        }
                      >
                        + 添加入口卡
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* 元信息 */}
      <div className="mt-8 rounded-md border border-border-subtle bg-surface p-4">
        <h2 className="mb-3 font-mono text-caption uppercase tracking-widest text-faint">
          meta · 维护信息
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="最后更新日期（如 2026-09-01）"
            value={draft.meta.updatedAt}
            onChange={(v) => mutate((d) => void (d.meta.updatedAt = v))}
          />
          <Field
            label="维护者署名"
            value={draft.meta.maintainer}
            onChange={(v) => mutate((d) => void (d.meta.maintainer = v))}
          />
        </div>
      </div>
    </div>
  );
}
