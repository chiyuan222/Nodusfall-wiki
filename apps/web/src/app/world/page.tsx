import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  WORLD_SECTION_LABEL,
  type WorldPageContent,
  type WorldSectionId,
} from "@/lib/world-content";
import { loadWorldContent } from "@/lib/world-content.server";
import { MediaSlotView } from "@/components/world/media-slot";

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

/* ---------- 幻灯片外壳：一页一板块，编号 + 页码 + 统一框架 ---------- */
function SlideShell({
  id,
  index,
  total,
  title,
  intro,
  children,
}: {
  id: string;
  index: number;
  total: number;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative scroll-mt-28 lg:scroll-mt-36"
    >
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-card">
        {/* 幻灯片页眉：编号 + 标题 + 页码 */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-border-subtle px-6 py-5 md:px-10">
          <span className="font-mono text-caption tracking-[0.35em] text-amber">
            {String(index).padStart(2, "0")}
          </span>
          <h2
            id={`${id}-title`}
            className="font-serif text-h1 font-semibold text-primary"
          >
            {title}
          </h2>
          <span
            aria-hidden
            className="ml-auto font-mono text-caption tracking-[0.3em] text-faint"
          >
            {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        {intro !== undefined && (
          <div className="max-w-reading px-6 pt-6 text-body leading-relaxed text-secondary md:px-10">
            {intro ? <p>{intro}</p> : <EmptySlot label="板块引言" />}
          </div>
        )}
        <div className="p-6 md:p-10">{children}</div>
      </div>
    </section>
  );
}

/* ---------- 首屏：主视觉大图 + 叠加标题（发布会首页感） ---------- */
function HeroSection({ content }: { content: WorldPageContent }) {
  const { hero } = content;
  return (
    <section aria-label="首屏" className="pt-8 lg:pt-12">
      <div className="relative overflow-hidden rounded-lg border border-border-subtle shadow-card">
        {/* 主视觉（图片/视频槽位，管理员可替换） */}
        <MediaSlotView media={hero.art} variant="hero" priority />
        {/* 渐变 + 叠加文案 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          {hero.kicker ? (
            <p className="font-mono text-caption uppercase tracking-[0.4em] text-white/70">
              {hero.kicker}
            </p>
          ) : (
            <span className="font-mono text-caption uppercase tracking-[0.4em] text-white/40">
              待管理员补充 · 首屏眉题
            </span>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <h1 className="font-serif text-[2.75rem] font-bold leading-none tracking-wide text-white drop-shadow md:text-[4.5rem]">
              {hero.title || "（待填写标题）"}
            </h1>
            {hero.subtitle && (
              <p className="pb-2 font-mono text-h3 tracking-[0.3em] text-white/70">
                {hero.subtitle}
              </p>
            )}
          </div>
          <div className="mt-4 max-w-reading text-body leading-relaxed text-white/85">
            {hero.lead ? (
              <p>{hero.lead}</p>
            ) : (
              <p className="font-mono text-caption text-white/50">
                待管理员补充 · 一句话介绍（首屏导语）
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 信息条 + 按钮 */}
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
              href={cta.href || "/"}
              className="min-w-32 rounded-md bg-amber px-5 py-2.5 text-center text-small font-medium tracking-widest text-amber-fg transition-opacity duration-fast hover:opacity-90"
            >
              {cta.label}
            </Link>
          ) : (
            <a
              key={`${cta.href}-${i}`}
              href={cta.href || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-32 rounded-md border border-border-subtle bg-raised px-5 py-2.5 text-center text-small tracking-widest text-primary transition-colors duration-fast hover:border-amber-soft"
            >
              {cta.label}
            </a>
          ),
        )}
      </div>
    </section>
  );
}

/* ---------- 概览：主视觉大图 + 档案表（规格页幻灯片） ---------- */
function OverviewSection({ content }: { content: WorldPageContent }) {
  const { overview } = content;
  return (
    <>
      <MediaSlotView media={overview.media} variant="banner" />
      <div className="mt-8 max-w-reading text-body leading-relaxed text-secondary">
        {overview.lead ? <p>{overview.lead}</p> : <EmptySlot label="游戏概览导语" />}
      </div>
      <dl className="mt-8 grid gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle md:grid-cols-2 lg:grid-cols-3">
        {overview.facts.map((fact, i) => (
          <div key={`${fact.label}-${i}`} className="bg-canvas p-4">
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

/* ---------- 世界观：每个词条一页幻灯片（大图 + 玻璃文字板，交替侧） ---------- */
function WorldviewSection({ content }: { content: WorldPageContent }) {
  const { worldview } = content;
  return (
    <ol className="space-y-8">
      {worldview.entries.map((entry, i) => (
        <li
          key={`${entry.no}-${i}`}
          className="relative overflow-hidden rounded-md border border-border-subtle"
        >
          {/* 词条大图（横幅比例，管理员可替换） */}
          <MediaSlotView media={entry.image} variant="banner" hint={false} />
          {/* 文字板：玻璃拟态浮层，移动端置于图下、桌面端交替贴左右下角 */}
          <div
            className={`relative border-t border-border-subtle bg-surface p-6 md:absolute md:bottom-6 md:w-[26rem] md:rounded-md md:border md:bg-canvas/85 md:shadow-overlay md:backdrop-blur-md ${
              i % 2 === 1 ? "md:right-6" : "md:left-6"
            }`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 right-3 select-none font-mono text-[3.5rem] font-bold leading-none text-border-subtle/70"
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
            <div className="mt-3 text-body leading-relaxed text-secondary">
              {entry.body ? (
                <p>{entry.body}</p>
              ) : (
                <EmptySlot label={`「${entry.title || entry.no}」词条正文`} />
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 玩法：每个玩法一页幻灯片（大图 + 文字栏交替） ---------- */
function GameplaySection({ content }: { content: WorldPageContent }) {
  const { gameplay } = content;
  return (
    <ol className="space-y-8">
      {gameplay.features.map((feature, i) => (
        <li
          key={`${feature.no}-${i}`}
          className="grid items-stretch gap-0 overflow-hidden rounded-md border border-border-subtle bg-canvas md:grid-cols-12"
        >
          <div
            className={`md:col-span-7 ${i % 2 === 1 ? "md:order-2" : ""}`}
          >
            <MediaSlotView media={feature.image} variant="entry" hint={false} />
          </div>
          <div
            className={`flex flex-col justify-center p-6 md:col-span-5 md:p-8 ${
              i % 2 === 1 ? "md:order-1" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-soft font-serif text-small text-amber">
                {feature.no}
              </span>
              <h3 className="font-serif text-h2 font-semibold text-primary">
                {feature.title || "（待填写玩法名）"}
              </h3>
            </div>
            <div className="mt-4 text-small leading-relaxed text-secondary">
              {feature.body ? <p>{feature.body}</p> : <EmptySlot label="玩法说明" />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 官方渠道图标（契约 iconKey：official / bilibili / douyin） ---------- */
const OFFICIAL_ICON_GUESS: [RegExp, string][] = [
  [/哔哩|bilibili/i, "bilibili"],
  [/抖音|douyin/i, "douyin"],
];
const OFFICIAL_ICON_LABEL: Record<string, string> = {
  official: "官",
  bilibili: "B",
  douyin: "抖",
};

function OfficialIcon({ iconKey, label }: { iconKey?: string; label: string }) {
  const key =
    iconKey ??
    OFFICIAL_ICON_GUESS.find(([re]) => re.test(label))?.[1] ??
    "official";
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-soft/60 bg-raised font-serif text-body font-semibold text-amber"
    >
      {OFFICIAL_ICON_LABEL[key] ?? OFFICIAL_ICON_LABEL.official}
    </span>
  );
}

/* ---------- 官方信息：主视觉 + 链接卡（含待补充态） ---------- */
function OfficialSection({ content }: { content: WorldPageContent }) {
  const { official } = content;
  return (
    <>
      <MediaSlotView media={official.media} variant="banner" />
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {official.links.map((link, i) => {
          const hasUrl = link.url.trim().length > 0;
          const inner = (
            <>
              <span className="flex min-w-0 items-center gap-4">
                <OfficialIcon iconKey={link.iconKey} label={link.label} />
                <span className="min-w-0">
                  <span className="block text-body font-medium text-primary group-hover:text-amber">
                    {link.label || "（待填写名称）"}
                  </span>
                  <span className="mt-1 block text-small text-faint">
                    {link.desc || "待管理员补充说明"}
                  </span>
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 font-mono text-h2 text-faint transition-colors duration-fast group-hover:text-amber"
              >
                {hasUrl ? "↗" : "—"}
              </span>
            </>
          );
          const cls =
            "group flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-canvas p-5 transition-colors duration-fast";
          return (
            <li key={`${link.label}-${i}`}>
              {hasUrl ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${cls} hover:border-amber-soft`}
                >
                  {inner}
                </a>
              ) : (
                <span
                  className={`${cls} border-dashed opacity-70`}
                  title="链接待管理员补充"
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ---------- 官方信息转载：媒体卡（图片/视频 + 标题 + 简介） ---------- */
function RepostsSection({ content }: { content: WorldPageContent }) {
  const { reposts } = content;
  if (reposts.items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-subtle p-8 text-center text-small text-faint">
        {reposts.emptyText || "管理员尚未转载官方信息。"}
      </div>
    );
  }
  return (
    <ol className="grid gap-5 md:grid-cols-2">
      {reposts.items.map((item, i) => {
        const card = (
          <>
            <MediaSlotView media={item.media} variant="card" hint={false} />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-caption">
                {item.source && (
                  <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 text-amber">
                    {item.source}
                  </span>
                )}
                {item.date && (
                  <time className="font-mono text-faint">{item.date}</time>
                )}
              </div>
              <h3 className="mt-2 text-h3 font-semibold text-primary group-hover:text-amber">
                {item.title || "（待填写标题）"}
              </h3>
              <div className="mt-2 text-small leading-relaxed text-secondary">
                {item.excerpt ? <p>{item.excerpt}</p> : <EmptySlot label="转载摘要" />}
              </div>
            </div>
          </>
        );
        return (
          <li key={`${item.date}-${item.title}-${i}`}>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-md border border-border-subtle bg-canvas transition-colors duration-fast hover:border-amber-soft"
              >
                {card}
              </a>
            ) : (
              <div className="group overflow-hidden rounded-md border border-border-subtle bg-canvas">
                {card}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- 最新动态：带媒体为卡片，纯文字为时间线行 ---------- */
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
    <ol className="grid gap-5 md:grid-cols-2">
      {news.items.map((item, i) => {
        const hasMedia = !!item.media && item.media.src.trim().length > 0;
        const body = (
          <>
            {hasMedia && (
              <MediaSlotView media={item.media} variant="card" hint={false} />
            )}
            <div className={hasMedia ? "p-5" : ""}>
              <div className="flex flex-wrap items-center gap-2 text-caption">
                {item.tag && (
                  <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 text-amber">
                    {item.tag}
                  </span>
                )}
                <time className="font-mono text-faint">{item.date || "——"}</time>
              </div>
              <h3 className="mt-2 text-h3 font-semibold text-primary group-hover:text-amber">
                {item.title || "（待填写标题）"}
              </h3>
              {item.excerpt ? (
                <p className="mt-2 text-small leading-relaxed text-secondary">
                  {item.excerpt}
                </p>
              ) : (
                hasMedia && <EmptySlot label="动态简介" />
              )}
            </div>
          </>
        );
        const cls = hasMedia
          ? "group block overflow-hidden rounded-md border border-border-subtle bg-canvas transition-colors duration-fast hover:border-amber-soft"
          : "group block rounded-md border border-border-subtle bg-canvas p-5 transition-colors duration-fast hover:border-amber-soft";
        return (
          <li key={`${item.date}-${item.title}-${i}`}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={cls}>
                {body}
              </a>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
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
  reposts: RepostsSection,
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
    <article className="mx-auto max-w-page space-y-10">
      {ordered.includes("hero") && <HeroSection content={content} />}

      {/* 页内锚点导航（粘性，类似 PPT 目录条） */}
      {navSections.length > 0 && (
        <nav
          aria-label="本页板块"
          className="sticky top-0 z-30 -mx-4 border-y border-border-subtle bg-canvas/90 px-4 backdrop-blur md:-mx-6 md:px-6 lg:top-14"
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
          <SlideShell
            key={id}
            id={id}
            index={i + 1}
            total={navSections.length}
            title={section?.title || WORLD_SECTION_LABEL[id]}
            intro={"intro" in section ? section.intro : undefined}
          >
            <Body content={content} />
          </SlideShell>
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
