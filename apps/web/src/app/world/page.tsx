import type { Metadata } from "next";
import Link from "next/link";
import { WorldFilm } from "@/components/world/world-film";
import { Reveal } from "@/components/world/reveal";

export const metadata: Metadata = {
  title: "世界观 · 概念艺术导览",
  description:
    "《源初之结》（Nodusfall）的世界观与整体框架概念导览：星海、结现、结络、世间——为新玩家准备的一页入门。",
};

const PILLARS = [
  {
    name: "结 · 源点",
    body: "万物自一个结开始。它是规则、是秩序，也是这个世界一切现象的总源头。",
  },
  {
    name: "坠 · 探索",
    body: "Nodusfall，自结而坠。玩家自源点坠入人间，在不断下探中拼合世界的全貌。",
  },
  {
    name: "织 · 共创",
    body: "每一个玩家都是织者。Wiki、攻略与讨论，都是重新编结这个世界的线。",
  },
] as const;

const FRAMEWORK = [
  {
    title: "探索",
    body: "地图、区域与隐藏要素的资料编目。",
    href: "/wiki",
    cta: "进入 Wiki",
  },
  {
    title: "养成",
    body: "角色培养路线与资源规划的玩家经验。",
    href: "/guides",
    cta: "查看攻略",
  },
  {
    title: "配队",
    body: "阵容搭配与关卡打法的社区方案。",
    href: "/guides",
    cta: "查找配队",
  },
  {
    title: "社区",
    body: "讨论、答疑与二创的集结地。",
    href: "/forum",
    cta: "加入论坛",
  },
] as const;

const STEPS = [
  { step: "壹", title: "读一条目", body: "从 Wiki 的一条基础资料开始，建立对世界的坐标感。" },
  { step: "贰", title: "看一篇攻略", body: "找一篇高分攻略，理解老玩家如何思考。" },
  { step: "叁", title: "打上一个结", body: "注册账号，留下你的第一条评论或编辑。" },
] as const;

export default function WorldPage() {
  return (
    <article className="-mx-4 -my-6 md:-mx-6">
      {/* 滚动电影：星海 → 结现 → 结络 → 世间 → 归处 */}
      <WorldFilm />

      {/* 正文：世界框架 */}
      <div className="mx-auto max-w-page px-4 md:px-6">
        <section aria-labelledby="pillars" className="mx-auto max-w-reading py-24">
          <Reveal>
            <p className="text-caption uppercase tracking-[0.4em] text-faint">
              世界的三种读法
            </p>
            <h2 id="pillars" className="mt-4 font-serif text-h1 font-semibold">
              结、坠、织
            </h2>
          </Reveal>
          <div className="mt-12 space-y-10">
            {PILLARS.map((p, i) => (
              <Reveal key={p.name} delay={i * 120}>
                <div className="flex gap-6">
                  <span
                    aria-hidden
                    className="mt-2 block h-2.5 w-2.5 shrink-0 rounded-full bg-amber"
                  />
                  <div>
                    <h3 className="font-serif text-h2 font-medium">{p.name}</h3>
                    <p className="mt-2 text-body leading-relaxed text-secondary">
                      {p.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <p className="mt-16 border-l-2 border-amber-soft pl-4 text-small text-faint">
              本页为世界观的社区概念化呈现，具体设定以游戏官方资料为准。
            </p>
          </Reveal>
        </section>

        <section aria-labelledby="framework" className="py-24">
          <Reveal>
            <h2 id="framework" className="text-center font-serif text-h1 font-semibold">
              从这里进入世界
            </h2>
            <p className="mx-auto mt-4 max-w-reading text-center text-body text-secondary">
              本站的四个内容域，对应你理解这款游戏的四条路径。
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FRAMEWORK.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <Link
                  href={f.href}
                  className="group flex h-full flex-col rounded-md border border-border-subtle bg-surface p-6 shadow-card transition-all duration-base ease-out hover:-translate-y-1 hover:border-amber-soft"
                >
                  <span aria-hidden className="font-mono text-caption text-faint">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 font-serif text-h2 font-medium group-hover:text-amber">
                    {f.title}
                  </h3>
                  <p className="mt-2 flex-1 text-small text-secondary">{f.body}</p>
                  <span className="mt-4 text-small text-amber">
                    {f.cta} →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="onboarding" className="mx-auto max-w-reading py-24">
          <Reveal>
            <h2 id="onboarding" className="text-center font-serif text-h1 font-semibold">
              新玩家三步
            </h2>
          </Reveal>
          <ol className="mt-12 space-y-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 120}>
                <li className="flex items-start gap-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-soft font-serif text-small text-amber">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-h3 font-semibold">{s.title}</h3>
                    <p className="mt-1 text-small text-secondary">{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={300}>
            <div className="mt-16 text-center">
              <Link
                href="/wiki"
                className="inline-block rounded-md bg-amber px-8 py-3 text-body font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
              >
                开始编织 →
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </article>
  );
}
