import type { Metadata } from "next";
import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";

export const metadata: Metadata = {
  title: "攻略",
  description: "《源初之结》玩家攻略：配队、养成与评分。",
};

const FEATURES = [
  { title: "评分排序", desc: "社区评分沉淀优质攻略，好内容浮上来" },
  { title: "标签筛选", desc: "按流派、敌人、阶段组合筛选" },
  { title: "评论讨论", desc: "每篇攻略下设讨论区，持续修订" },
  { title: "编辑器", desc: "结构化写作，段落、配装与图片混排" },
] as const;

export default function GuidesIndexPage() {
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
          玩家产出的攻略与心得：流派构筑、讨伐节奏、配装思路。列表与评分将在后端数据接入后开放。
        </p>
      </header>

      {/* 排序/筛选栏（待数据接入，禁用态） */}
      <div
        aria-label="排序与筛选（待数据接入）"
        className="flex flex-wrap items-center gap-2"
      >
        {["最新", "评分最高", "最多讨论"].map((s) => (
          <span
            key={s}
            title="待数据接入后启用"
            className="cursor-not-allowed rounded-full border border-border-subtle px-4 py-1.5 text-small text-faint"
          >
            {s}
          </span>
        ))}
        <span className="ml-2 font-mono text-caption text-faint">
          筛选将在数据接入后启用
        </span>
      </div>

      {/* 空态 */}
      <section aria-label="攻略列表" className="flex flex-col items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-16 text-center">
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
      </section>

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
