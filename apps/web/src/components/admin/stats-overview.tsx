"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useMe, hasPermission } from "@/lib/me";
import type { components } from "@/lib/schema";

/**
 * 站点统计总览（/admin/stats，契约 PR #51：GET /admin/stats/overview）。
 * 总览卡 + 近 7 天趋势（纯 CSS 条形图，weekly 按日期升序）+ 内容热度 Top10。
 */

type Overview = components["schemas"]["AdminStatsOverview"];

const KIND_LABEL: Record<string, string> = {
  wikiPage: "Wiki",
  guide: "攻略",
  forumThread: "论坛",
};

function topHref(kind: string, slug: string): string {
  switch (kind) {
    case "wikiPage":
      return `/wiki/${slug}`;
    case "guide":
      return `/guides/${slug}`;
    default:
      return `/forum/threads/${slug}`;
  }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-5">
      <p className="font-mono text-caption uppercase tracking-[0.25em] text-faint">{label}</p>
      <p className="mt-2 font-serif text-h1 font-semibold text-primary">{value}</p>
      {sub && <p className="mt-1 text-caption text-secondary">{sub}</p>}
    </div>
  );
}

export function StatsOverview() {
  const { me, pending } = useMe();
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");

  const allowed = me && hasPermission(me, "manage_content");

  useEffect(() => {
    if (!allowed) return;
    request<{ data: Overview }>("/admin/stats/overview")
      .then((r) => setData(r.data))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) setErr("当前账号没有查看统计的权限。");
        else setErr("统计加载失败，后端可能未在线。");
      });
  }, [allowed]);

  if (pending) return <p className="py-16 text-center text-small text-faint">正在校验权限…</p>;
  if (!allowed)
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-h1 font-semibold">无访问权限</h1>
        <p className="mt-3 text-small text-secondary">站点统计仅对管理员开放。</p>
      </div>
    );
  if (err) return <p role="alert" className="py-16 text-center text-small text-danger">{err}</p>;
  if (!data) return <p className="py-16 text-center text-small text-faint">载入中…</p>;

  const maxPv = Math.max(1, ...data.weekly.map((d) => d.pv));

  return (
    <div className="py-8">
      <h1 className="font-serif text-h1 font-semibold">站点统计</h1>

      {/* 总览卡 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="注册用户" value={data.users.total} sub={`今日新增 ${data.users.todayNew}`} />
        <StatCard label="今日 PV / UV" value={`${data.today.pv} / ${data.today.uv}`} sub={`今日活跃 ${data.today.dau} 人`} />
        <StatCard label="昨日 PV / UV" value={`${data.yesterday.pv} / ${data.yesterday.uv}`} sub={`昨日活跃 ${data.yesterday.dau} 人`} />
        <StatCard label="当前在线" value={data.online} sub={`近 30 天月活 ${data.monthly.mau}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 近 7 天趋势 */}
        <section aria-labelledby="weekly" className="rounded-md border border-border-subtle bg-surface p-5">
          <h2 id="weekly" className="font-serif text-h2 font-semibold">近 7 天趋势</h2>
          <div className="mt-4 flex h-40 items-end gap-2" role="img"
            aria-label={`近 7 天 PV：${data.weekly.map((d) => `${d.date} ${d.pv}`).join("，")}`}>
            {data.weekly.map((d) => (
              <div key={d.date} className="flex h-full min-w-0 grow flex-col items-center justify-end gap-1">
                <span className="font-mono text-caption text-faint">{d.pv}</span>
                <span
                  className="w-full rounded-t-sm bg-amber/80"
                  style={{ height: `${Math.max(2, (d.pv / maxPv) * 100)}%` }}
                  title={`${d.date}：PV ${d.pv} / UV ${d.uv} / 活跃 ${d.dau}`}
                />
                <span className="font-mono text-caption text-faint">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-caption text-faint">柱高为 PV；悬停查看 UV 与活跃人数。</p>
        </section>

        {/* 内容热度 Top10 */}
        <section aria-labelledby="top" className="rounded-md border border-border-subtle bg-surface p-5">
          <h2 id="top" className="font-serif text-h2 font-semibold">内容热度 Top 10</h2>
          {data.topContents.length === 0 ? (
            <p className="mt-4 rounded-sm border border-dashed border-border-subtle px-4 py-6 text-center font-mono text-caption text-faint">
              暂无浏览数据。
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-border-subtle">
              {data.topContents.map((t, i) => (
                <li key={`${t.kind}-${t.slug}`}>
                  <Link href={topHref(t.kind, t.slug)} className="group flex items-center gap-3 py-2.5">
                    <span className="w-6 shrink-0 text-center font-mono text-caption text-amber">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
                      {KIND_LABEL[t.kind] ?? t.kind}
                    </span>
                    <span className="min-w-0 grow truncate text-small text-primary group-hover:text-amber">
                      {t.title}
                    </span>
                    <span className="shrink-0 font-mono text-caption text-secondary">{t.views} 次</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
