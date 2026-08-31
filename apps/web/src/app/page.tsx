import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeContent } from "@/lib/home-content.server";
import { MediaSlotView } from "@/components/world/media-slot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "首页",
  description: "《源初之结》（Nodusfall）非官方玩家 Wiki、攻略与论坛。",
};

/** 空槽位：未填写内容的占位（不显示任何虚构文案） */
function EmptySlot({ label }: { label: string }) {
  return (
    <span className="block rounded-sm border border-dashed border-border-subtle px-3 py-2 font-mono text-caption text-faint">
      待管理员补充 · {label}
    </span>
  );
}

export default async function HomePage() {
  const content = await loadHomeContent();

  if (!content) {
    return (
      <div className="mx-auto max-w-reading py-24 text-center">
        <h1 className="font-serif text-h1 font-semibold">内容配置缺失</h1>
        <p className="mt-4 text-body text-secondary">
          未找到 <code className="font-mono text-amber">public/content/home-page.json</code>
          ，或文件格式有误。请管理员在 /admin/home 重新导出并替换该文件。
        </p>
      </div>
    );
  }

  const visible = (id: "hero" | "notice" | "digest" | "entries") =>
    content.sections.includes(id) && !content[id].hidden;

  return (
    <div className="space-y-12">
      {/* 公告条 */}
      {visible("notice") && (content.notice.text || content.notice.linkLabel) && (
        <aside
          aria-label="站点公告"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-amber-soft/60 bg-surface px-5 py-3"
        >
          <span className="font-mono text-caption uppercase tracking-[0.3em] text-amber">
            公告
          </span>
          <p className="text-small text-secondary">{content.notice.text}</p>
          {content.notice.linkHref && content.notice.linkLabel && (
            <Link
              href={content.notice.linkHref}
              className="ml-auto text-small text-amber hover:underline"
            >
              {content.notice.linkLabel} →
            </Link>
          )}
        </aside>
      )}

      {/* 首屏横幅：文案 + 放大媒体（图片或视频），媒体以编辑风双线框装裱 */}
      {visible("hero") && (
        <section aria-label="首屏" className="relative pt-4 lg:pt-8">
          {/* 衬线水印 */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-0 select-none font-serif text-[11rem] font-semibold leading-none text-primary opacity-[0.05] lg:text-[16rem]"
          >
            结
          </span>
          <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              {content.hero.kicker ? (
                <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
                  {content.hero.kicker}
                </p>
              ) : (
                <EmptySlot label="眉题" />
              )}
              <h1 className="mt-4 font-serif text-[2.5rem] font-semibold leading-tight text-primary md:text-display lg:text-[2.75rem]">
                {content.hero.title || "（待填写主标题）"}
              </h1>
              <div className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
                {content.hero.lead ? (
                  <p>{content.hero.lead}</p>
                ) : (
                  <EmptySlot label="首屏导语" />
                )}
              </div>
              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                {content.hero.ctas.map((cta, i) =>
                  cta.style === "primary" ? (
                    <Link
                      key={`${cta.href}-${i}`}
                      href={cta.href || "/"}
                      className="rounded-md bg-amber px-4 py-2.5 text-center text-small font-medium tracking-widest text-amber-fg transition-opacity duration-fast hover:opacity-90"
                    >
                      {cta.label}
                    </Link>
                  ) : (
                    <Link
                      key={`${cta.href}-${i}`}
                      href={cta.href || "/"}
                      className="rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-center text-small tracking-widest text-primary transition-colors duration-fast hover:border-amber-soft"
                    >
                      {cta.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
            <div className="lg:col-span-8">
              {/* 放大主视觉：外层编辑风双线框 */}
              <div className="rounded-lg border border-border-subtle bg-surface p-2 shadow-card">
                <MediaSlotView media={content.hero.media} variant="banner" priority />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 两栏快报：最新动态 | 精华推荐 */}
      {visible("digest") && (
        <section aria-label="最新动态与精华推荐" className="grid gap-6 md:grid-cols-2">
          {(
            [
              ["latest", content.digest.latest],
              ["featured", content.digest.featured],
            ] as const
          ).map(([key, col]) => (
            <div
              key={key}
              className="rounded-md border border-border-subtle bg-surface p-5 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-3">
                <h2 className="font-serif text-h2 font-semibold text-primary">
                  {col.title || "（待填写栏目标题）"}
                </h2>
                <span aria-hidden className="font-mono text-caption uppercase tracking-[0.3em] text-faint">
                  {key === "latest" ? "NEWS" : "PICKS"}
                </span>
              </div>
              {(() => {
                const slots = Array.from(
                  { length: Math.max(6, col.items.length) },
                  (_, i) => col.items[i] ?? null,
                );
                return (
                  <ol className="mt-2 divide-y divide-border-subtle">
                    {slots.map((item, i) =>
                      item ? (
                        <li key={`${item.url}-${i}`}>
                          <Link
                            href={item.url || "/"}
                            className="group flex items-center gap-4 py-3"
                          >
                            <span className="min-w-0 grow">
                              <span className="flex items-center gap-2">
                                {item.tag && (
                                  <span className="shrink-0 rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                                    {item.tag}
                                  </span>
                                )}
                                <span className="truncate text-body font-medium text-primary group-hover:text-amber">
                                  {item.title || "（待填写标题）"}
                                </span>
                              </span>
                              {item.excerpt && (
                                <span className="mt-1 line-clamp-1 block text-small text-secondary">
                                  {item.excerpt}
                                </span>
                              )}
                              {item.date && (
                                <time className="mt-1 block font-mono text-caption text-faint">
                                  {item.date}
                                </time>
                              )}
                            </span>
                            {item.image && (
                              // eslint-disable-next-line @next/next/no-img-element -- 管理员自填的缩略图路径
                              <img
                                src={item.image}
                                alt=""
                                loading="lazy"
                                className="h-14 w-24 shrink-0 rounded-sm border border-border-subtle object-cover"
                              />
                            )}
                          </Link>
                        </li>
                      ) : (
                        <li key={`empty-${i}`} aria-hidden>
                          <span className="flex items-center gap-4 py-3 opacity-50">
                            <span className="min-w-0 grow">
                              <span className="block h-4 w-2/3 rounded-sm border border-dashed border-border-subtle" />
                              <span className="mt-1.5 block h-3 w-1/3 rounded-sm border border-dashed border-border-subtle" />
                            </span>
                            <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-sm border border-dashed border-border-subtle font-mono text-caption text-faint">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </span>
                        </li>
                      ),
                    )}
                  </ol>
                );
              })()}
              {col.items.length === 0 && (
                <p className="mt-3 text-center font-mono text-caption text-faint">
                  {col.emptyText || "待管理员补充。"}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* 入口卡：媒体 + 标题 + 简介 */}
      {visible("entries") && (
        <section aria-labelledby="home-entries">
          <h2 id="home-entries" className="font-serif text-h1 font-semibold">
            {content.entries.title || "内容分区"}
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {content.entries.cards.map((card, i) => (
              <li key={`${card.href}-${i}`}>
                <Link
                  href={card.href || "/"}
                  className="group block h-full overflow-hidden rounded-md border border-border-subtle bg-surface shadow-card transition-colors duration-fast hover:border-amber-soft"
                >
                  <MediaSlotView media={card.media} variant="card" hint={false} />
                  <div className="p-5">
                    <h3 className="flex items-center justify-between text-h3 font-semibold text-primary group-hover:text-amber">
                      {card.title || "（待填写名称）"}
                      <span aria-hidden className="font-mono text-faint transition-colors duration-fast group-hover:text-amber">
                        →
                      </span>
                    </h3>
                    <div className="mt-2 text-small leading-relaxed text-secondary">
                      {card.desc ? <p>{card.desc}</p> : <EmptySlot label="入口简介" />}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
