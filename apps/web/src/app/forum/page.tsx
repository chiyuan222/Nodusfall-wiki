import type { Metadata } from "next";
import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";

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

export default function ForumIndexPage() {
  return (
    <div className="mx-auto max-w-page space-y-12">
      {/* 页头 */}
      <header className="pt-6 lg:pt-10">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Community Forum
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
          论坛
        </h1>
        <p className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          织者的集结地：讨论、求助与分享。板块与主题流将在后端数据接入后开放。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 板块框架 */}
        <aside aria-label="板块列表" className="lg:col-span-4">
          <div className="rounded-md border border-border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-h3 font-semibold">
              <KnotMark size={18} />
              板块
            </h2>
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
          </div>
        </aside>

        {/* 主题流 */}
        <section aria-label="主题流" className="lg:col-span-8">
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
