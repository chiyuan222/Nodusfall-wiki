import { Injectable } from '@nestjs/common';
import { Guide, WikiPage, ForumThread, User } from '@prisma/client';
import { extractFirstImage } from '../common/markdown';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';

type DigestKind = 'wiki' | 'guide' | 'forum';

interface RawItem {
  kind: DigestKind;
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage: string | null;
  author: User;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  boardSlug: string | null;
  likeCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  replyCount: number;
  commentTarget: { type: 'WIKI_PAGE' | 'GUIDE' | 'FORUM_THREAD'; id: string };
}

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async digest(latestLimit: number, featuredLimit: number, userId?: string) {
    const [wikiLatest, guideLatest, forumLatest] = await Promise.all([
      this.prisma.wikiPage.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: latestLimit,
        include: { author: true },
      }),
      this.prisma.guide.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: latestLimit,
        include: { author: true },
      }),
      this.prisma.forumThread.findMany({
        orderBy: { lastPostAt: 'desc' },
        take: latestLimit,
        include: { author: true, board: true },
      }),
    ]);

    const [wikiFeatured, guideFeatured, forumFeatured] = await Promise.all([
      this.prisma.wikiPage.findMany({
        where: { featuredAt: { not: null } },
        orderBy: { featuredAt: 'desc' },
        take: featuredLimit,
        include: { author: true },
      }),
      this.prisma.guide.findMany({
        where: { featuredAt: { not: null } },
        orderBy: { featuredAt: 'desc' },
        take: featuredLimit,
        include: { author: true },
      }),
      this.prisma.forumThread.findMany({
        where: { featuredAt: { not: null } },
        orderBy: { featuredAt: 'desc' },
        take: featuredLimit,
        include: { author: true, board: true },
      }),
    ]);

    const latestRaw = [
      ...wikiLatest.map((p) => this.toRaw('wiki', p)),
      ...guideLatest.map((g) => this.toRaw('guide', g)),
      ...forumLatest.map((t) => this.toRaw('forum', t)),
    ].sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    ).slice(0, latestLimit);

    const featuredRaw = [
      ...wikiFeatured.map((p) => this.toRaw('wiki', p)),
      ...guideFeatured.map((g) => this.toRaw('guide', g)),
      ...forumFeatured.map((t) => this.toRaw('forum', t)),
    ].sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    ).slice(0, featuredLimit);

    return {
      data: {
        latest: await this.hydrate(latestRaw, userId),
        featured: await this.hydrate(featuredRaw, userId),
      },
    };
  }

  private toRaw(
    kind: DigestKind,
    item: (WikiPage & { author: User }) | (Guide & { author: User }) | (ForumThread & { author: User; board: any }),
  ): RawItem {
    if (kind === 'forum') {
      const thread = item as ForumThread & { author: User; board: any };
      return {
        kind,
        id: thread.id,
        title: thread.title,
        slug: '',
        content: thread.content,
        coverImage: thread.coverImage ?? extractFirstImage(thread.content),
        author: thread.author,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        publishedAt: thread.lastPostAt ?? thread.createdAt,
        boardSlug: thread.board.slug,
        likeCount: thread.likeCount,
        ratingAvg: null,
        ratingCount: 0,
        replyCount: thread.replyCount,
        commentTarget: { type: 'FORUM_THREAD', id: thread.id },
      };
    }
    if (kind === 'guide') {
      const guide = item as Guide & { author: User };
      return {
        kind,
        id: guide.id,
        title: guide.title,
        slug: guide.slug,
        content: guide.content,
        coverImage: guide.coverImage ?? extractFirstImage(guide.content),
        author: guide.author,
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt,
        publishedAt: guide.createdAt,
        boardSlug: null,
        likeCount: 0,
        ratingAvg: guide.ratingAvg,
        ratingCount: guide.ratingCount,
        replyCount: 0,
        commentTarget: { type: 'GUIDE', id: guide.id },
      };
    }
    const page = item as WikiPage & { author: User };
    return {
      kind,
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      coverImage: page.coverImage ?? extractFirstImage(page.content),
      author: page.author,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      publishedAt: page.createdAt,
      boardSlug: null,
      likeCount: 0,
      ratingAvg: null,
      ratingCount: 0,
      replyCount: 0,
      commentTarget: { type: 'WIKI_PAGE', id: page.id },
    };
  }

  private async hydrate(items: RawItem[], userId?: string) {
    const commentCounts = await this.commentCounts(items);
    return items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      slug: item.slug,
      excerpt: item.content.replace(/[#>*_`~\-[\]()!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) || null,
      coverImage: item.coverImage,
      author: toUserSummary(item.author),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      publishedAt: item.publishedAt?.toISOString() ?? null,
      boardSlug: item.boardSlug,
      stats: {
        viewCount: 0,
        likeCount: item.likeCount,
        commentCount:
          item.kind === 'forum'
            ? item.replyCount
            : (commentCounts.get(`${item.commentTarget.type}:${item.commentTarget.id}`) ?? 0),
        scoreAverage: item.ratingAvg,
        scoreCount: item.ratingCount,
      },
      likedByMe: null,
      bookmarkedByMe: null,
      myScore: null,
    }));
  }

  private async commentCounts(items: RawItem[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const byType = (type: 'WIKI_PAGE' | 'GUIDE' | 'FORUM_THREAD') =>
      items.filter((i) => i.commentTarget.type === type);
    for (const type of ['WIKI_PAGE', 'GUIDE'] as const) {
      const ids = byType(type).map((i) => i.commentTarget.id);
      if (ids.length === 0) continue;
      const rows = await this.prisma.comment.groupBy({
        by: ['targetType', 'targetId'],
        where: { targetType: type as any, targetId: { in: ids } },
        _count: true,
      });
      for (const row of rows) {
        map.set(`${row.targetType}:${row.targetId}`, row._count);
      }
    }
    return map;
  }
}
