import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  WORLD_SECTION_LABEL,
  type WorldPageContent,
  type WorldSectionId,
} from "@/lib/world-content";
import { loadWorldContent } from "@/lib/world-content.server";
import { ArtSlot } from "@/components/world/art-slot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "游戏总览",
  description:
    "《源初之结》（Nodusfall）游戏总览：游戏概览、世界观设定、玩法介绍、官方信息与最新动态——由站点管理员维护的非官方入门页。",
};

/* ---------- 空槽位：未填写内容的占位（不显示任何虚构文案） ---------- */
function EmptySlot({ label }: { label: string }) {
  return (
    <span className="block rounded-sm border border-dashed border-border-subtle px-3 py-2 font-mono text-caption text-faint">
      待管理员补充 · {label}
    </span>
  );
}

/* ---------- 板块外壳：编号 + 标题 + 锚点 ---------- */
function SectionShell({
  id,
  index,
  title,
  intro,
  children,
}: {
  id: string;
  index: number;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 border-t border-border-subtle py-14 lg:scroll-mt-36"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-mono text-caption tracking-[0.35em] text-amber">
          {String(index).padStart(2, "0")}
        </span>
        <h2
          id={`${id}-title`}
          className="font-serif text-h1 font-semibold text-primary"
        >
          {title}
        </h2>
      </div>
      {intro !== undefined && (
        <div className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          {intro ? <p>{intro}</p> : <EmptySlot label="板块引言" />}
        </div>
      )}
      <div className="mt-10">{children}</div>
    </section>
  );
}

/* ---------- 首屏 ---------- */
function HeroSection({ content }: { content: WorldPageContent }) {
  const { hero } = content;
  return (
    <section aria-label="首屏" className="pt-10 lg:pt-16">
      {hero.kicker ? (
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          {hero.kicker}
        </p>
      ) : (
        <EmptySlot label="首屏眉题" />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <h1 className="font-serif text-[2.75rem] font-bold leading-none tracking-wide text-primary md:text-[4.5rem]">
          {hero.title || "（待填写标题）"}
        </h1>
        {hero.subtitle && (
          <p className="pb-2 font-mono text-h3 tracking-[0.3em] text-faint">
            {hero.subtitle}
          </p>
        )}
      </div>

      <div className="mt-6 max-w-reading text-body leading-relaxed text-secondary">
        {hero.lead ? <p>{hero.lead}</p> : <EmptySlot label="一句话介绍（首屏导语）" />}
      </div>

      <div className="mt-8">
        <ArtSlot image={hero.art} variant="hero" priority />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {hero.chips.map((chip, i) => (
          <span
            key={`${chip.label}-${i}`}
            className="rounded-full border border-border-subtle bg-surface px-3 py-1 text-caption text-secondary"
          >
            <span className="text-faint">{chip.label}</span>
            <span className="mx-1.5 text-border-subtle">·</span>
            {chip.value || "—"}
          </span>
        ))}
        <span className="grow" />
        {hero.ctas.map((cta, i) =>
          cta.style === "primary" ? (
            <Link
              key={`${cta.href}-${i}`}
              href={cta.href}
              className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
            >
              {cta.label}
            </Link>
          ) : (
            <a
              key={`${cta.href}-${i}`}
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
            >
              {cta.label}
            </a>
          ),
        )}
      </div>
    </section>
  );
}

/* ---------- 概览：档案表 ---------- */
function OverviewSection({ content }: { content: WorldPageContent }) {
  const { overview } = content;
  return (
    <>
      <div className="max-w-reading text-body leading-relaxed text-secondary">
        {overview.lead ? <p>{overview.lead}</p> : <EmptySlot label="游戏概览导语" />}
      </div>
      <dl className="mt-8 grid gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle md:grid-cols-2 lg:grid-cols-3">
        {overview.facts.map((fact, i) => (
          <div key={`${fact.label}-${i}`} className="bg-surface p-4">
            <dt className="font-mono text-caption uppercase tracking-widest text-faint">
              {fact.label || "（未命名项）"}
            </dt>
            <dd className="mt-1.5 text-small text-primary">
              {fact.value || <span className="text-faint">待管理员补充</span>}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/* ---------- 世界观：词条交替行 ---------- */
function WorldviewSection({ content }: { content: WorldPageContent }) {
  const { worldview } = content;
  return (
    <ol className="space-y-14">
      {worldview.entries.map((entry, i) => (
        <li
          key={`${entry.no}-${i}`}
          className="grid items-center gap-6 md:grid-cols-12"
        >
          <div
            className={`md:col-span-5 ${i % 2 === 1 ? "md:order-2" : ""}`}
          >
            <ArtSlot image={entry.image} variant="entry" />
          </div>
          <div
            className={`relative md:col-span-7 ${i % 2 === 1 ? "md:order-1" : ""}`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-9 right-0 select-none font-mono text-[4.5rem] font-bold leading-none text-border-subtle/60"
            >
              {entry.no}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-serif text-h1 font-semibold text-amber">
                {entry.title || "（待填写词条名）"}
              </h3>
              {entry.en && (
                <span className="font-mono text-small tracking-widest text-faint">
                  {entry.en}
                </span>
              )}
              {entry.tag && (
                <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 text-caption text-amber">
                  {entry.tag}
                </span>
              )}
            </div>
            <div className="mt-3 max-w-reading text-body leading-relaxed text-secondary">
              {entry.body ? <p>{entry.body}</p> : <EmptySlot label={`「${entry.title || entry.no}」词条正文`} />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 玩法：编号卡片 ---------- */
function GameplaySection({ content }: { content: WorldPageContent }) {
  const { gameplay } = content;
  return (
    <ol className="grid gap-5 md:grid-cols-2">
      {gameplay.features.map((feature, i) => (
        <li
          key={`${feature.no}-${i}`}
          className="group rounded-md border border-border-subtle bg-surface shadow-card transition-colors duration-fast hover:border-amber-soft"
        >
          <ArtSlot image={feature.image} variant="card" hint={false} />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-soft font-serif text-caption text-amber">
                {feature.no}
              </span>
              <h3 className="text-h3 font-semibold text-primary">
                {feature.title || "（待填写玩法名）"}
              </h3>
            </div>
            <div className="mt-3 text-small leading-relaxed text-secondary">
              {feature.body ? <p>{feature.body}</p> : <EmptySlot label="玩法说明" />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 官方信息：链接卡 ---------- */
function OfficialSection({ content }: { content: WorldPageContent }) {
  const { official } = content;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {official.links.map((link, i) => (
        <li key={`${link.url}-${i}`}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-surface p-5 transition-colors duration-fast hover:border-amber-soft"
          >
            <span>
              <span className="block text-body font-medium text-primary group-hover:text-amber">
                {link.label || "（待填写名称）"}
              </span>
              <span className="mt-1 block text-small text-faint">
                {link.desc || "待管理员补充说明"}
              </span>
            </span>
            <span
              aria-hidden
              className="font-mono text-h2 text-faint transition-colors duration-fast group-hover:text-amber"
            >
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 最新动态：时间线 ---------- */
function NewsSection({ content }: { content: WorldPageContent }) {
  const { news } = content;
  if (news.items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-subtle p-8 text-center text-small text-faint">
        {news.emptyText || "管理员尚未发布动态。"}
      </div>
    );
  }
  return (
    <ol className="space-y-0">
      {news.items.map((item, i) => (
        <li
          key={`${item.date}-${item.title}-${i}`}
          className="flex gap-5 border-b border-border-subtle py-5 first:pt-0 last:border-0"
        >
          <time className="w-24 shrink-0 pt-0.5 font-mono text-caption text-faint">
            {item.date || "——"}
          </time>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {item.tag && (
                <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 text-caption text-amber">
                  {item.tag}
                </span>
              )}
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body font-medium text-primary hover:text-amber"
                >
                  {item.title}
                </a>
              ) : (
                <span className="text-body font-medium text-primary">{item.title}</span>
              )}
            </div>
            {item.excerpt && (
              <p className="mt-1 text-small text-secondary">{item.excerpt}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

const SECTION_BODY: Record<
  Exclude<WorldSectionId, "hero">,
  (props: { content: WorldPageContent }) => ReactNode
> = {
  overview: OverviewSection,
  worldview: WorldviewSection,
  gameplay: GameplaySection,
  official: OfficialSection,
  news: NewsSection,
};

export default async function WorldPage() {
  const content = await loadWorldContent();

  if (!content) {
    return (
      <div className="mx-auto max-w-reading py-24 text-center">
        <h1 className="font-serif text-h1 font-semibold">内容配置缺失</h1>
        <p className="mt-4 text-body text-secondary">
          未找到 <code className="font-mono text-amber">public/content/world-page.json</code>
          ，或文件格式有误。请管理员在 /admin/world 重新导出并替换该文件。
        </p>
      </div>
    );
  }

  const ordered = content.sections.filter((id) => {
    const section = content[id];
    return section && !(section as { hidden?: boolean }).hidden;
  });
  const navSections = ordered.filter((id) => id !== "hero");

  return (
    <article className="mx-auto max-w-page">
      {ordered.includes("hero") && <HeroSection content={content} />}

      {/* 页内锚点导航（粘性） */}
      {navSections.length > 0 && (
        <nav
          aria-label="本页板块"
          className="sticky top-0 z-30 -mx-4 mt-10 border-y border-border-subtle bg-canvas/90 px-4 backdrop-blur md:-mx-6 md:px-6 lg:top-14"
        >
          <ul className="flex gap-1 overflow-x-auto py-2.5">
            {navSections.map((id, i) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="flex items-baseline gap-1.5 rounded-md px-3 py-1.5 text-small text-secondary transition-colors duration-fast hover:bg-raised hover:text-primary"
                >
                  <span className="font-mono text-caption text-amber">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {WORLD_SECTION_LABEL[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {navSections.map((id, i) => {
        const section = content[id] as { title?: string; intro?: string };
        const Body = SECTION_BODY[id as Exclude<WorldSectionId, "hero">];
        return (
          <SectionShell
            key={id}
            id={id}
            index={i + 1}
            title={section?.title || WORLD_SECTION_LABEL[id]}
            intro={"intro" in section ? section.intro : undefined}
          >
            <Body content={content} />
          </SectionShell>
        );
      })}

      {/* 页脚：维护信息与非官方声明 */}
      <footer className="border-t border-border-subtle py-10 text-small text-faint">
        <p>
          本页为非官方玩家 Wiki 的总览页，内容由站点管理员维护
          {content.meta.updatedAt ? ` · 最后更新 ${content.meta.updatedAt}` : ""}
          {content.meta.maintainer ? ` · 维护：${content.meta.maintainer}` : ""}。
        </p>
        <p className="mt-2">
          《源初之结》（NODUSFALL）的商标与素材版权归米哈游 / HoYoverse 所有；本站与官方无关。
          内容管理入口：<Link href="/admin/world" className="text-amber hover:underline">/admin/world</Link>
        </p>
      </footer>
    </article>
  );
}
