import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* 首屏：节点母题主视觉 */}
      <section className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface px-6 py-16 text-center shadow-card md:py-24">
        {/* 琥珀辉光 */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--accent-amber), transparent)" }}
        />
        <p className="relative text-caption uppercase tracking-[0.4em] text-faint">
          Nodusfall · 非官方玩家社区
        </p>
        <h1 className="relative mx-auto mt-4 max-w-reading font-serif text-display font-semibold leading-tight">
          万物之结，由此而始
        </h1>
        <p className="relative mx-auto mt-4 max-w-reading text-body text-secondary">
          《源初之结》的玩家 Wiki、攻略与讨论论坛。资料由社区共同维护。
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/world"
            className="rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            游戏总览
          </Link>
          <Link
            href="/wiki"
            className="rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
          >
            浏览 Wiki
          </Link>
          <Link
            href="/guides"
            className="rounded-md px-6 py-2.5 text-small text-secondary transition-colors duration-fast hover:text-primary"
          >
            查看攻略 →
          </Link>
        </div>
      </section>

      {/* 三个内容域入口：契约冻结后接入数据（见 docs/design/frontend-review.md §1.2） */}
      <div className="grid gap-6 md:grid-cols-3">
        <section aria-labelledby="home-wiki">
          <h2 id="home-wiki" className="mb-4 font-serif text-h2 font-medium">
            <Link href="/wiki" className="hover:text-amber">
              Wiki 条目 →
            </Link>
          </h2>
          <EmptyState
            title="资料编目进行中"
            description="Wiki 条目列表将在后端接口就绪后展示。数据来自 GET /v1/wiki/pages。"
          />
        </section>
        <section aria-labelledby="home-guides">
          <h2 id="home-guides" className="mb-4 font-serif text-h2 font-medium">
            <Link href="/guides" className="hover:text-amber">
              热门攻略 →
            </Link>
          </h2>
          <EmptyState
            title="等待第一篇攻略"
            description="攻略按评分排序展示。数据来自 GET /v1/guides?sort=rating。"
          />
        </section>
        <section aria-labelledby="home-forum">
          <h2 id="home-forum" className="mb-4 font-serif text-h2 font-medium">
            <Link href="/forum" className="hover:text-amber">
              论坛讨论 →
            </Link>
          </h2>
          <EmptyState
            title="集结讨论区"
            description="板块列表来自 GET /v1/forum/boards。跨板块最新动态待契约补充端点（提案 §6.4）。"
          />
        </section>
      </div>
    </div>
  );
}
