import type { Metadata } from "next";
import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";

export const metadata: Metadata = {
  title: "Wiki 资料库",
  description: "《源初之结》Wiki：分类浏览、标签筛选与条目搜索。",
};

const FEATURES = [
  { title: "分类浏览", desc: "按设定、系统、物品等分类逐级深入" },
  { title: "标签筛选", desc: "多标签组合，快速定位目标条目" },
  { title: "全文搜索", desc: "标题与正文统一检索，直达内容" },
  { title: "版本历史", desc: "每次修改可追溯、可比对、可回退" },
] as const;

export default function WikiIndexPage() {
  return (
    <div className="mx-auto max-w-page space-y-12">
      {/* 页头 */}
      <header className="pt-6 lg:pt-10">
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Wiki Database
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary md:text-[2.5rem]">
          Wiki 资料库
        </h1>
        <p className="mt-4 max-w-reading text-body leading-relaxed text-secondary">
          由玩家共同维护的《源初之结》资料库。条目、分类与版本历史将在后端数据接入后逐一点亮。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 分类导航框架 */}
        <aside aria-label="分类导航" className="lg:col-span-4">
          <div className="rounded-md border border-border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-h3 font-semibold">
              <KnotMark size={18} />
              分类导航
            </h2>
            <ul className="mt-4 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-sm border border-dashed border-border-subtle px-3 py-2.5 text-small text-faint"
                >
                  <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-border-subtle" />
                  待创建分类 · {String(i).padStart(2, "0")}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-caption text-faint">
              分类框架由管理员在后端数据就绪后建立。
            </p>
          </div>
        </aside>

        {/* 条目区 */}
        <section aria-label="条目列表" className="lg:col-span-8">
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-16 text-center">
            <KnotMark size={44} />
            <h2 className="mt-5 font-serif text-h2 font-semibold">
              第一批条目正在编目
            </h2>
            <p className="mt-3 max-w-reading text-small leading-relaxed text-secondary">
              资料库尚未开放检索。你可以先到游戏总览页了解世界观与玩法框架，
              或使用搜索查找已上线内容。
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/world"
                className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
              >
                前往游戏总览
              </Link>
              <Link
                href="/search"
                className="rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
              >
                先去搜索
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* 能力预告 */}
      <section aria-labelledby="wiki-features" className="border-t border-border-subtle pt-10">
        <h2 id="wiki-features" className="font-serif text-h2 font-semibold">
          资料库将提供
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
