import type { Metadata } from "next";
import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";
import { Carousel } from "@/components/carousel";
import { getForumIndexData, USE_MOCK } from "@/lib/data";
import { getForumCarousel } from "@/lib/carousel-data";
import { authorName } from "@/lib/author";
import { FloatingWindows } from "@/components/forum/floating-windows";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "论坛",
  description: "《源初之结》玩家论坛：板块讨论、主题与回复。",
};

const FEATURES = [
  { title: "板块讨论", desc: "按主题划分板块，各归其位" },
  { title: "图文主题", desc: "带图主题在列表直接显示封面与摘要" },
  { title: "回复互动", desc: "楼层回复、点赞与引用" },
  { title: "精华沉淀", desc: "优质讨论加精，汇入首页推荐" },
] as const;

export default async function ForumIndexPage() {
  const [data, carousel] = await Promise.all([
    getForumIndexData(),
    getForumCarousel(),
  ]);

  return (
    <div className="mx-auto max-w-page space-y-12">
      {/* 左右漂浮引流窗（站长配置二维码/友情站，可关闭，契约 PR #70） */}
      <FloatingWindows />
      {/* 页头 */}
      <header className="pt-6 lg:pt-10">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Community Forum
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
          论坛
        </h1>
        <p className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          织者的集结地：讨论、求助与分享。
          {USE_MOCK && (
            <span className="ml-2 rounded-sm border border-amber-soft px-1.5 py-0.5 font-mono text-caption text-amber">
              MOCK 数据预览
            </span>
          )}
        </p>
        <div className="mt-5">
          {/* 论坛未开放：板块管理入口先建好但置灰（权限体系 v2 第二波） */}
          <button
            type="button"
            disabled
            title="论坛暂未开放，板块管理稍后上线"
            className="cursor-not-allowed rounded-md border border-border-subtle px-4 py-1.5 text-small text-faint opacity-60"
          >
            ⚙ 板块管理（未开放）
          </button>
        </div>
      </header>

      {/* 轮替推荐框：板块热帖（置顶优先，5 位轮播，点击跳转对应帖子） */}
      <section aria-label="论坛热帖轮播">
        <Carousel
          label="论坛热帖轮播"
          slides={carousel}
          emptyHint="热帖推荐 · 待内容接入"
          variant="compact"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 板块列表 */}
        <aside aria-label="板块列表" className="lg:col-span-4">
          <div className="rounded-md border border-border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-h3 font-semibold">
              <KnotMark size={18} />
              板块
            </h2>
            {data && data.boards.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {data.boards.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/forum/${b.slug}`}
                      className="group flex items-center gap-3 rounded-sm border border-border-subtle px-3 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
                    >
                      <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-amber" />
                      {b.name}
                      <span className="ml-auto font-mono text-caption text-faint">
                        {b.threadCount} 主题
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-sm border border-dashed border-border-subtle px-3 py-2.5 text-small text-faint"
                    >
                      <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-border-subtle" />
                      待创建板块 · {String(i).padStart(2, "0")}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-caption text-faint">
                  板块由管理员在后端数据就绪后建立。
                </p>
              </>
            )}
          </div>
        </aside>

        {/* 主题流 */}
        <section aria-label="主题流" className="lg:col-span-8">
          {data && data.threads.data.length > 0 ? (
            <ol className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-surface">
              {data.threads.data.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/forum/threads/${t.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-raised"
                  >
                    <span className="min-w-0 grow">
                      <span className="flex items-center gap-2">
                        {t.pinned && (
                          <span className="shrink-0 rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                            置顶
                          </span>
                        )}
                        {t.locked && (
                          <span className="shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
                            锁定
                          </span>
                        )}
                        <span className="truncate text-body font-medium text-primary group-hover:text-amber">
                          {t.title}
                        </span>
                      </span>
                      <span className="mt-1 block font-mono text-caption text-faint">
                        {authorName(t.author)} · 最后回复 {t.lastPostAt.slice(0, 10)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-4 text-center font-mono text-caption text-secondary">
                      <span>
                        <span className="block text-small text-primary">{t.replyCount}</span>
                        回复
                      </span>
                      <span>
                        <span className="block text-small text-primary">{t.likeCount}</span>
                        喜欢
                      </span>
                      <span>
                        <span className="block text-small text-primary">{t.viewCount}</span>
                        浏览
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-16 text-center">
            <KnotMark size={44} />
            <h2 className="mt-5 font-serif text-h2 font-semibold">
              板块集结中
            </h2>
            <p className="mt-3 max-w-reading text-small leading-relaxed text-secondary">
              讨论区尚未开版。你可以先到游戏总览页了解世界观与玩法框架，
              或回首页查看最新动态与精华推荐。
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/world"
                className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
              >
                前往游戏总览
              </Link>
              <Link
                href="/"
                className="rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
              >
                回到首页
              </Link>
            </div>
          </div>
          )}
        </section>
      </div>

      {/* 能力预告 */}
      <section aria-labelledby="forum-features" className="border-t border-border-subtle pt-10">
        <h2 id="forum-features" className="font-serif text-h2 font-semibold">
          论坛将提供
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
