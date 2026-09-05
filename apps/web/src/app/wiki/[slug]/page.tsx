import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { wikiApi, type WikiPage } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { Markdown, slugifyHeading } from "@/components/markdown";
import { CommentSection } from "@/components/comment-section";
import { WikiEditEntry } from "@/components/wiki/wiki-edit-entry";
import { HistoryReporter } from "@/components/history-reporter";
import { InteractionBar } from "@/components/interaction-bar";
import { ContentActions } from "@/components/content-actions";
import { authorName } from "@/lib/author";
import { SiteIdMark } from "@/components/user-marks";
import { ReportEntry } from "@/components/report-button";

async function loadPage(slug: string): Promise<WikiPage> {
  try {
    return await wikiApi.page(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const page = await wikiApi.page(params.slug);
    return { title: page.title, description: page.excerpt };
  } catch {
    return { title: "Wiki 条目" };
  }
}

/** 从 Markdown 提取 h2/h3 生成目录（slug 算法与 Markdown 组件渲染一致） */
function extractToc(content: string) {
  const toc: { depth: number; text: string; id: string }[] = [];
  const seen = new Map<string, number>();
  for (const line of content.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const text = m[2]!.replace(/[*_`]/g, "").trim();
    toc.push({
      depth: m[1]!.length,
      text,
      id: slugifyHeading(text, seen),
    });
  }
  return toc;
}

export default async function WikiPageDetail({
  params,
}: {
  params: { slug: string };
}) {
  const page = await loadPage(params.slug);
  const comments = await wikiApi.comments(params.slug).catch(() => ({
    data: [],
    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0, hasMore: false },
  }));
  const toc = extractToc(page.content);

  return (
    <div className="mx-auto max-w-page">
      <HistoryReporter kind="wikiPage" slug={page.slug} />
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/wiki" className="text-secondary transition-colors duration-fast hover:text-amber">
          WIKI
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{page.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_240px]">
        <article className="space-y-10">
          <header className="space-y-4">
            <h1 className="font-serif text-display font-semibold">{page.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-faint">
              <span>{authorName(page.author)}</span>
              <SiteIdMark siteId={page.author.siteId} />
              <span aria-hidden>·</span>
              <time dateTime={page.updatedAt}>
                更新于 {new Date(page.updatedAt).toLocaleDateString("zh-CN")}
              </time>
              <span aria-hidden>·</span>
              <span>v{page.version} · {page.revisionCount} 次修订</span>
              <WikiEditEntry variant="edit" slug={page.slug} />
            </div>
            <InteractionBar
              kind="wiki"
              target={page.slug}
              viewCount={page.viewCount}
              likeCount={page.likeCount}
              likedByMe={page.likedByMe}
              bookmarkedByMe={page.bookmarkedByMe}
              dislikeCount={page.dislikeCount}
              dislikedByMe={page.dislikedByMe}
            />
            <div className="flex flex-wrap items-center gap-2">
              <ContentActions
                kind="wiki"
                target={page.slug}
                author={{ id: page.author.id, displayName: authorName(page.author) }}
              />
              <ReportEntry targetType="wikiPage" targetId={page.id} author={page.author} />
            </div>
            {page.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="标签">
                {page.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-sm border border-border-subtle px-2 py-0.5 font-mono text-caption text-secondary"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </header>

          <Markdown content={page.content} />

          <CommentSection
            targetType="wiki"
            slug={params.slug}
            initial={comments}
          />
        </article>

        {/* 粘性目录 */}
        <aside
          aria-label="目录"
          className="hidden lg:sticky lg:top-20 lg:block lg:self-start"
        >
          <div className="rounded-md border border-border-subtle bg-surface p-4">
            <p className="font-mono text-caption uppercase tracking-[0.3em] text-faint">
              Contents
            </p>
            <h2 className="mt-1 text-small font-semibold text-secondary">目录</h2>
            {toc.length === 0 ? (
              <p className="mt-3 text-caption text-faint">本篇无小节标题。</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {toc.map((h) => (
                  <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
                    <a
                      href={`#${h.id}`}
                      className="text-small text-secondary transition-colors duration-fast hover:text-amber"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
