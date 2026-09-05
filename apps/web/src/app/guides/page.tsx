import type { Metadata } from "next";
import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";
import { Carousel } from "@/components/carousel";
import { GuideCreateEntry } from "@/components/guides/guide-create-entry";
import { BoardManageEntry } from "@/components/board-manage-entry";
import { getGuideList, getGuideCategories, USE_MOCK } from "@/lib/data";
import { getGuideCarousel } from "@/lib/carousel-data";
import { authorName } from "@/lib/author";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "攻略",
  description: "《源初之结》玩家攻略：配队、养成与评分。",
};

function RatingBadge({ rating, count }: { rating: number; count?: number }) {
  const rated = rating > 0;
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center rounded-md border px-3 py-2 ${
        rated ? "border-amber-soft/60 text-amber" : "border-dashed border-border-subtle text-faint"
      }`}
      aria-label={rated ? `评分 ${rating}` : "暂无评分"}
    >
      <span className="font-serif text-h3 font-semibold leading-none">
        {rated ? rating.toFixed(1) : "—"}
      </span>
      <span className="mt-1 font-mono text-caption">
        {rated && count !== undefined ? `${count} 人` : "未评分"}
      </span>
    </span>
  );
}

const FEATURES = [
  { title: "评分排序", desc: "社区评分沉淀优质攻略，好内容浮上来" },
  { title: "标签筛选", desc: "按流派、敌人、阶段组合筛选" },
  { title: "评论讨论", desc: "每篇攻略下设讨论区，持续修订" },
  { title: "编辑器", desc: "结构化写作，段落、配装与图片混排" },
] as const;

export default async function GuidesIndexPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const activeCategory = searchParams.category ?? "";
  const [list, carousel, categories] = await Promise.all([
    getGuideList(activeCategory || undefined),
    getGuideCarousel(),
    getGuideCategories(),
  ]);
  const categoryName = (slug?: string | null) =>
    categories.find((c) => c.slug === slug)?.name ?? null;

  return (
    <div className="mx-auto max-w-page space-y-12">
      {/* 页头 */}
      <header className="pt-6 lg:pt-10">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Guides &amp; Builds
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
          攻略
        </h1>
        <p className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          玩家产出的攻略与心得：流派构筑、讨伐节奏、配装思路。
          {USE_MOCK && (
            <span className="ml-2 rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
              MOCK 数据预览
            </span>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <GuideCreateEntry />
          <BoardManageEntry perm="manage_guide_board" href="/admin/guides" />
        </div>
      </header>

      {/* 轮替推荐框：最新攻略（5 位轮播，角标显示评分，点击跳转对应攻略） */}
      <section aria-label="攻略推荐轮播">
        <Carousel
          label="攻略推荐轮播"
          slides={carousel}
          emptyHint="攻略推荐 · 待内容接入"
          variant="compact"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 分类导航（GET /guides/categories；选中 → /guides?category=slug） */}
        <aside aria-label="攻略分类导航" className="lg:col-span-4">
          <div className="rounded-md border border-border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-h3 font-semibold">
              <KnotMark size={18} />
              分类导航
            </h2>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/guides"
                  aria-current={!activeCategory ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-sm border px-3 py-2.5 text-small transition-colors duration-fast ${
                    !activeCategory
                      ? "border-amber-soft text-amber"
                      : "border-border-subtle text-primary hover:border-amber-soft"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`block h-1.5 w-1.5 rounded-full ${!activeCategory ? "bg-amber" : "bg-border-subtle"}`}
                  />
                  全部攻略
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/guides?category=${c.slug}`}
                    aria-current={activeCategory === c.slug ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-sm border px-3 py-2.5 text-small transition-colors duration-fast ${
                      activeCategory === c.slug
                        ? "border-amber-soft text-amber"
                        : "border-border-subtle text-primary hover:border-amber-soft"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`block h-1.5 w-1.5 rounded-full ${activeCategory === c.slug ? "bg-amber" : "bg-border-subtle"}`}
                    />
                    {c.name}
                    <span aria-hidden className="ml-auto font-mono text-caption text-faint transition-colors duration-fast group-hover:text-amber">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {categories.length === 0 && (
              <p className="mt-4 text-caption text-faint">
                分类框架由管理员在板块管理中建立。
              </p>
            )}
          </div>
        </aside>

        {/* 攻略列表（有数据）/ 空态（无数据） */}
        <section aria-label="攻略列表" className="lg:col-span-8">
          {activeCategory && (
            <p className="mb-4 text-small text-secondary">
              分类：{categoryName(activeCategory) ?? activeCategory}{" "}
              <Link href="/guides" className="ml-2 text-amber hover:underline">
                查看全部 ×
              </Link>
            </p>
          )}
          {list && list.data.length > 0 ? (
        <ol aria-label="攻略列表" className="space-y-4">
          {list.data.map((g) => (
            <li key={g.id}>
              <Link
                href={`/guides/${g.slug}`}
                className="group flex items-center gap-5 rounded-md border border-border-subtle bg-surface p-5 shadow-card transition-colors duration-fast hover:border-amber-soft"
              >
                <RatingBadge rating={g.rating} count={g.ratingCount} />
                <span className="min-w-0 grow">
                  <span className="block truncate text-body font-semibold text-primary group-hover:text-amber">
                    {g.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-small leading-relaxed text-secondary">
                    {g.excerpt}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-faint">
                    {categoryName(g.categorySlug) && (
                      <span className="rounded-sm border border-amber-soft px-1.5 py-0.5 text-amber">
                        {categoryName(g.categorySlug)}
                      </span>
                    )}
                    {g.tags.map((t) => (
                      <span key={t} className="rounded-sm border border-border-subtle px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto font-mono">
                      {authorName(g.author)} · {g.updatedAt.slice(0, 10)} · 👍 {g.likeCount}{g.dislikeCount > 0 && <> · <span className="text-danger">⚑ {g.dislikeCount}</span></>} · ◉ {g.viewCount}
                    </span>
                  </span>
                </span>
                {g.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- 契约列表级封面图
                  <img
                    src={g.coverImage}
                    alt=""
                    loading="lazy"
                    className="hidden h-16 w-28 shrink-0 rounded-sm border border-border-subtle object-cover sm:block"
                  />
                )}
              </Link>
            </li>
          ))}
        </ol>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-16 text-center">
        <KnotMark size={44} />
        <h2 className="mt-5 font-serif text-h2 font-semibold">
          等待第一篇攻略
        </h2>
        <p className="mt-3 max-w-reading text-small leading-relaxed text-secondary">
          游戏尚未上线，攻略区虚位以待。你可以先熟悉编辑器，上线后第一时间发布你的构筑。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/editor/guide/new"
            className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            撰写攻略
          </Link>
          <Link
            href="/world"
            className="rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
          >
            了解玩法框架
          </Link>
        </div>
            </div>
          )}
        </section>
      </div>

      {/* 能力预告 */}
      <section aria-labelledby="guides-features" className="border-t border-border-subtle pt-10">
        <h2 id="guides-features" className="font-serif text-h2 font-semibold">
          攻略区将提供
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className="rounded-md border border-border-subtle bg-surface p-5"
            >
              <span className="font-mono text-caption tracking-[0.3em] text-amber">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-body font-semibold">{f.title}</h3>
              <p className="mt-1 text-small text-secondary">{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
