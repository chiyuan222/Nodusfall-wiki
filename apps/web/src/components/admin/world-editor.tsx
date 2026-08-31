"use client";

import { useEffect, useState } from "react";
import type {
  WorldPageContent,
  WorldSectionId,
} from "@/lib/world-content";
import { WORLD_SECTION_LABEL } from "@/lib/world-content";

/**
 * /world 总览页内容编辑器（临时本地方案，待后端 CMS 契约冻结后替换为接口读写）
 *
 * 工作流：编辑 → 「下载 JSON」→ 替换 apps/web/public/content/world-page.json 并提交。
 * 图片：把图片文件放入 apps/web/public/content/，在图片字段填相对路径（如 /content/key-art.webp）。
 */

type Draft = WorldPageContent;

/* ---------- 基础控件 ---------- */

function Field({
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

function ImageField({
  value,
  onChange,
}: {
  value: { src: string; alt: string };
  onChange: (v: { src: string; alt: string }) => void;
}) {
  return (
    <div className="rounded-md border border-border-subtle p-3">
      <Field
        label="图片路径（留空 = 占位画框；把图片放进 public/content/ 后填如 /content/xxx.webp）"
        value={value.src}
        onChange={(src) => onChange({ ...value, src })}
        placeholder="/content/example.webp"
      />
      <div className="mt-2">
        <Field
          label="替代文本 alt"
          value={value.alt}
          onChange={(alt) => onChange({ ...value, alt })}
        />
      </div>
      {value.src.trim() && (
        // eslint-disable-next-line @next/next/no-img-element -- 编辑器内预览管理员自填路径
        <img
          src={value.src}
          alt={value.alt || "预览"}
          className="mt-3 max-h-40 rounded-md border border-border-subtle object-cover"
        />
      )}
    </div>
  );
}

function RowActions({
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

/** 泛型数组编辑器外壳 */
function ItemCard({
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
  children: React.ReactNode;
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

const addBtnCls =
  "rounded-md border border-dashed border-border-subtle px-4 py-2 text-caption text-faint hover:border-amber-soft hover:text-amber";

/* ---------- 主编辑器 ---------- */

export function WorldEditor() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openSection, setOpenSection] = useState<WorldSectionId | null>("hero");

  const load = () => {
    setError("");
    fetch("/content/world-page.json", { cache: "no-store" })
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

  /** 数组通用操作 */
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

  const toggleHidden = (id: WorldSectionId) =>
    mutate((d) => {
      const s = d[id] as { hidden?: boolean };
      s.hidden = !s.hidden;
    });

  const exportJson = () => JSON.stringify(draft, null, 2);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "world-page.json";
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
          无法加载 <code className="font-mono text-amber">/content/world-page.json</code>（{error}）
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
        <h1 className="font-serif text-h1 font-semibold">总览页内容管理</h1>
        {dirty && (
          <span className="rounded-sm border border-amber-soft px-2 py-0.5 text-caption text-amber">
            有未导出的修改
          </span>
        )}
        <span className="grow" />
        <a
          href="/world"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
        >
          预览 /world ↗
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

      {/* 临时方案说明 */}
      <div className="mt-4 rounded-md border border-border-subtle bg-surface p-4 text-small text-secondary">
        <p>
          这是后端 CMS 接口就绪前的<strong className="text-primary">临时本地工作流</strong>：
          在此处编辑 → 点击「下载 JSON」→ 用下载的文件替换仓库中的
          <code className="font-mono text-amber"> apps/web/public/content/world-page.json </code>
          并提交。图片请先把文件放入
          <code className="font-mono text-amber"> apps/web/public/content/ </code>
          再在此填写路径。接口冻结后，本页将改为直接读写后端（契约问题已随 PR 提交给后端 Agent）。
        </p>
      </div>

      {/* 板块列表 */}
      <ol className="mt-8 space-y-4">
        {draft.sections.map((id, i) => {
          const section = draft[id] as { hidden?: boolean };
          const hidden = !!section.hidden;
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
                  {WORLD_SECTION_LABEL[id]}
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
                  {id === "hero" && <HeroForm draft={draft} mutate={mutate} listOp={listOp} />}
                  {id === "overview" && <OverviewForm draft={draft} mutate={mutate} listOp={listOp} />}
                  {id === "worldview" && <WorldviewForm draft={draft} mutate={mutate} listOp={listOp} />}
                  {id === "gameplay" && <GameplayForm draft={draft} mutate={mutate} listOp={listOp} />}
                  {id === "official" && <OfficialForm draft={draft} mutate={mutate} listOp={listOp} />}
                  {id === "news" && <NewsForm draft={draft} mutate={mutate} listOp={listOp} />}
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

/* ---------- 各板块表单 ---------- */

type FormProps = {
  draft: Draft;
  mutate: (fn: (d: Draft) => void) => void;
  listOp: <T>(
    get: (d: Draft) => T[],
    op: "move" | "remove" | "add",
    payload: { index?: number; to?: number; item?: T },
  ) => void;
};

function HeroForm({ draft, mutate, listOp }: FormProps) {
  const h = draft.hero;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="眉题 kicker" value={h.kicker} onChange={(v) => mutate((d) => void (d.hero.kicker = v))} />
        <Field label="副标题（英文）" value={h.subtitle} onChange={(v) => mutate((d) => void (d.hero.subtitle = v))} />
      </div>
      <Field label="主标题" value={h.title} onChange={(v) => mutate((d) => void (d.hero.title = v))} />
      <Field label="导语 lead" value={h.lead} textarea onChange={(v) => mutate((d) => void (d.hero.lead = v))} />
      <ImageField value={h.art} onChange={(v) => mutate((d) => void (d.hero.art = v))} />

      <div>
        <p className="mb-2 font-mono text-caption text-faint">信息条 chips</p>
        <div className="space-y-3">
          {h.chips.map((chip, i) => (
            <ItemCard
              key={i}
              title={`chips[${i}]`}
              index={i}
              length={h.chips.length}
              onMove={(f, t) => listOp((d) => d.hero.chips, "move", { index: f, to: t })}
              onRemove={(x) => listOp((d) => d.hero.chips, "remove", { index: x })}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="标签" value={chip.label} onChange={(v) => mutate((d) => void (d.hero.chips[i]!.label = v))} />
                <Field label="内容" value={chip.value} onChange={(v) => mutate((d) => void (d.hero.chips[i]!.value = v))} />
              </div>
            </ItemCard>
          ))}
        </div>
        <button type="button" className={`${addBtnCls} mt-3`} onClick={() => listOp((d) => d.hero.chips, "add", { item: { label: "", value: "" } })}>
          + 添加信息条
        </button>
      </div>

      <div>
        <p className="mb-2 font-mono text-caption text-faint">按钮 ctas</p>
        <div className="space-y-3">
          {h.ctas.map((cta, i) => (
            <ItemCard
              key={i}
              title={`ctas[${i}]`}
              index={i}
              length={h.ctas.length}
              onMove={(f, t) => listOp((d) => d.hero.ctas, "move", { index: f, to: t })}
              onRemove={(x) => listOp((d) => d.hero.ctas, "remove", { index: x })}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="文字" value={cta.label} onChange={(v) => mutate((d) => void (d.hero.ctas[i]!.label = v))} />
                <Field label="链接（站内 / 或 https://）" value={cta.href} onChange={(v) => mutate((d) => void (d.hero.ctas[i]!.href = v))} />
                <label className="block">
                  <span className="mb-1 block font-mono text-caption text-faint">样式</span>
                  <select
                    value={cta.style}
                    onChange={(e) => mutate((d) => void (d.hero.ctas[i]!.style = e.target.value as "primary" | "ghost"))}
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
  );
}

function OverviewForm({ draft, mutate, listOp }: FormProps) {
  const o = draft.overview;
  return (
    <>
      <Field label="板块标题" value={o.title} onChange={(v) => mutate((d) => void (d.overview.title = v))} />
      <Field label="导语" value={o.lead} textarea onChange={(v) => mutate((d) => void (d.overview.lead = v))} />
      <div className="space-y-3">
        {o.facts.map((fact, i) => (
          <ItemCard
            key={i}
            title={`facts[${i}]`}
            index={i}
            length={o.facts.length}
            onMove={(f, t) => listOp((d) => d.overview.facts, "move", { index: f, to: t })}
            onRemove={(x) => listOp((d) => d.overview.facts, "remove", { index: x })}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="条目名" value={fact.label} onChange={(v) => mutate((d) => void (d.overview.facts[i]!.label = v))} />
              <Field label="内容" value={fact.value} onChange={(v) => mutate((d) => void (d.overview.facts[i]!.value = v))} />
            </div>
          </ItemCard>
        ))}
      </div>
      <button type="button" className={`${addBtnCls} mt-3`} onClick={() => listOp((d) => d.overview.facts, "add", { item: { label: "", value: "" } })}>
        + 添加档案条目
      </button>
    </>
  );
}

function WorldviewForm({ draft, mutate, listOp }: FormProps) {
  const w = draft.worldview;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="板块标题" value={w.title} onChange={(v) => mutate((d) => void (d.worldview.title = v))} />
        <Field label="板块引言" value={w.intro} onChange={(v) => mutate((d) => void (d.worldview.intro = v))} />
      </div>
      <div className="space-y-3">
        {w.entries.map((entry, i) => (
          <ItemCard
            key={i}
            title={`entries[${i}]`}
            index={i}
            length={w.entries.length}
            onMove={(f, t) => listOp((d) => d.worldview.entries, "move", { index: f, to: t })}
            onRemove={(x) => listOp((d) => d.worldview.entries, "remove", { index: x })}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="编号" value={entry.no} onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.no = v))} />
              <Field label="词条名" value={entry.title} onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.title = v))} />
              <Field label="英文" value={entry.en} onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.en = v))} />
              <Field label="来源标注" value={entry.tag} onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.tag = v))} />
            </div>
            <Field label="正文" value={entry.body} textarea onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.body = v))} />
            <ImageField value={entry.image} onChange={(v) => mutate((d) => void (d.worldview.entries[i]!.image = v))} />
          </ItemCard>
        ))}
      </div>
      <button
        type="button"
        className={`${addBtnCls} mt-3`}
        onClick={() =>
          listOp((d) => d.worldview.entries, "add", {
            item: { no: String(draft.worldview.entries.length + 1).padStart(2, "0"), title: "", en: "", body: "", tag: "待确认", image: { src: "", alt: "" } },
          })
        }
      >
        + 添加词条
      </button>
    </>
  );
}

function GameplayForm({ draft, mutate, listOp }: FormProps) {
  const g = draft.gameplay;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="板块标题" value={g.title} onChange={(v) => mutate((d) => void (d.gameplay.title = v))} />
        <Field label="板块引言" value={g.intro} onChange={(v) => mutate((d) => void (d.gameplay.intro = v))} />
      </div>
      <div className="space-y-3">
        {g.features.map((feature, i) => (
          <ItemCard
            key={i}
            title={`features[${i}]`}
            index={i}
            length={g.features.length}
            onMove={(f, t) => listOp((d) => d.gameplay.features, "move", { index: f, to: t })}
            onRemove={(x) => listOp((d) => d.gameplay.features, "remove", { index: x })}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="编号" value={feature.no} onChange={(v) => mutate((d) => void (d.gameplay.features[i]!.no = v))} />
              <Field label="玩法名" value={feature.title} onChange={(v) => mutate((d) => void (d.gameplay.features[i]!.title = v))} />
              <div className="md:col-span-3">
                <Field label="说明" value={feature.body} textarea onChange={(v) => mutate((d) => void (d.gameplay.features[i]!.body = v))} />
              </div>
            </div>
            <ImageField value={feature.image} onChange={(v) => mutate((d) => void (d.gameplay.features[i]!.image = v))} />
          </ItemCard>
        ))}
      </div>
      <button
        type="button"
        className={`${addBtnCls} mt-3`}
        onClick={() =>
          listOp((d) => d.gameplay.features, "add", {
            item: { no: "新", title: "", body: "", image: { src: "", alt: "" } },
          })
        }
      >
        + 添加玩法
      </button>
    </>
  );
}

function OfficialForm({ draft, mutate, listOp }: FormProps) {
  const o = draft.official;
  return (
    <>
      <Field label="板块标题" value={o.title} onChange={(v) => mutate((d) => void (d.official.title = v))} />
      <div className="space-y-3">
        {o.links.map((link, i) => (
          <ItemCard
            key={i}
            title={`links[${i}]`}
            index={i}
            length={o.links.length}
            onMove={(f, t) => listOp((d) => d.official.links, "move", { index: f, to: t })}
            onRemove={(x) => listOp((d) => d.official.links, "remove", { index: x })}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="名称" value={link.label} onChange={(v) => mutate((d) => void (d.official.links[i]!.label = v))} />
              <Field label="URL" value={link.url} onChange={(v) => mutate((d) => void (d.official.links[i]!.url = v))} />
              <Field label="说明" value={link.desc} onChange={(v) => mutate((d) => void (d.official.links[i]!.desc = v))} />
            </div>
          </ItemCard>
        ))}
      </div>
      <button type="button" className={`${addBtnCls} mt-3`} onClick={() => listOp((d) => d.official.links, "add", { item: { label: "", url: "", desc: "" } })}>
        + 添加链接
      </button>
    </>
  );
}

function NewsForm({ draft, mutate, listOp }: FormProps) {
  const n = draft.news;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="板块标题" value={n.title} onChange={(v) => mutate((d) => void (d.news.title = v))} />
        <Field label="空列表提示语" value={n.emptyText} onChange={(v) => mutate((d) => void (d.news.emptyText = v))} />
      </div>
      <div className="space-y-3">
        {n.items.map((item, i) => (
          <ItemCard
            key={i}
            title={`items[${i}]`}
            index={i}
            length={n.items.length}
            onMove={(f, t) => listOp((d) => d.news.items, "move", { index: f, to: t })}
            onRemove={(x) => listOp((d) => d.news.items, "remove", { index: x })}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="日期（如 2026-08-20）" value={item.date} onChange={(v) => mutate((d) => void (d.news.items[i]!.date = v))} />
              <Field label="标签（如 官方动态）" value={item.tag} onChange={(v) => mutate((d) => void (d.news.items[i]!.tag = v))} />
              <Field label="链接（可留空）" value={item.url} onChange={(v) => mutate((d) => void (d.news.items[i]!.url = v))} />
            </div>
            <Field label="标题" value={item.title} onChange={(v) => mutate((d) => void (d.news.items[i]!.title = v))} />
            <Field label="摘要（可留空）" value={item.excerpt} textarea onChange={(v) => mutate((d) => void (d.news.items[i]!.excerpt = v))} />
          </ItemCard>
        ))}
      </div>
      <button
        type="button"
        className={`${addBtnCls} mt-3`}
        onClick={() => listOp((d) => d.news.items, "add", { item: { date: "", tag: "", title: "", url: "", excerpt: "" } })}
      >
        + 添加动态
      </button>
    </>
  );
}
