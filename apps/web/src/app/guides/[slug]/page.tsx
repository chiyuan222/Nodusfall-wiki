import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guidesApi, type Guide, type RatingSummary } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { Markdown } from "@/components/markdown";
import { CommentSection } from "@/components/comment-section";
import { RatingPanel } from "@/components/rating-panel";
import { RatingStars } from "@/components/rating-stars";
import { GuideEditEntry } from "@/components/guides/guide-edit-entry";
import { HistoryReporter } from "@/components/history-reporter";
import { InteractionBar } from "@/components/interaction-bar";
import { ContentActions } from "@/components/content-actions";
import { authorName } from "@/lib/author";
import { SiteIdMark } from "@/components/user-marks";
import { ReportButton, ReportUserButton } from "@/components/report-button";

async function loadGuide(slug: string): Promise<Guide> {
  try {
    return await guidesApi.get(slug);
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
    const guide = await guidesApi.get(params.slug);
    return { title: guide.title, description: guide.excerpt };
  } catch {
    return { title: "攻略" };
  }
}

export default async function GuideDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const guide = await loadGuide(params.slug);
  const emptyPage = {
    data: [],
    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0, hasMore: false },
  };
  const [rating, comments] = await Promise.all([
    guidesApi.rating(params.slug).catch(
      (): RatingSummary => ({
        average: guide.rating,
        count: guide.ratingCount ?? 0,
        myScore: null,
        distribution: {},
      }),
    ),
    guidesApi.comments(params.slug).catch(() => emptyPage),
  ]);

  return (
    <div className="mx-auto max-w-page">
      <HistoryReporter kind="guide" slug={guide.slug} />
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex items-center gap-2 font-mono text-caption text-faint">
        <Link href="/guides" className="text-secondary transition-colors duration-fast hover:text-amber">
          GUIDES
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-faint">{guide.title}</span>
      </nav>

      <div className="mt-6 space-y-10">
        <article className="space-y-6">
          <header className="max-w-reading space-y-4">
            <h1 className="font-serif text-display font-semibold">{guide.title}</h1>
            {guide.excerpt && (
              <p className="text-body text-secondary">{guide.excerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-faint">
              <span>{authorName(guide.author)}</span>
              <SiteIdMark siteId={guide.author.siteId} />
              <span aria-hidden>·</span>
              <time dateTime={guide.updatedAt}>
                更新于 {new Date(guide.updatedAt).toLocaleDateString("zh-CN")}
              </time>
              <span aria-hidden>·</span>
              <RatingStars rating={guide.rating} count={guide.ratingCount} />
              <GuideEditEntry slug={guide.slug} authorId={guide.author.id} />
            </div>
            <InteractionBar
              kind="guide"
              target={guide.slug}
              viewCount={guide.viewCount}
              likeCount={guide.likeCount}
              likedByMe={guide.likedByMe}
              bookmarkedByMe={guide.bookmarkedByMe}
              dislikeCount={guide.dislikeCount}
              dislikedByMe={guide.dislikedByMe}
            />
            <div className="flex flex-wrap items-center gap-2">
              <ContentActions
                kind="guide"
                target={guide.slug}
                author={{ id: guide.author.id, displayName: authorName(guide.author) }}
              />
              <ReportButton targetType="guide" targetId={guide.id} />
              <ReportUserButton author={guide.author} />
            </div>
            {guide.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="标签">
                {guide.tags.map((tag) => (
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

          <Markdown content={guide.content} />
        </article>

        <RatingPanel slug={params.slug} initial={rating} />

        <CommentSection
          targetType="guide"
          slug={params.slug}
          initial={comments}
          title="讨论"
        />
      </div>
    </div>
  );
}
