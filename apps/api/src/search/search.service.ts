import { Injectable } from '@nestjs/common';
import { pageInfo } from '../common/pagination';
import { extractFirstImage } from '../common/markdown';
import { PrismaService } from '../prisma/prisma.service';

type Kind = 'all' | 'wiki' | 'guide' | 'forum';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, kind: Kind, page: number, perPage: number) {
    const results: Array<{
      kind: 'wiki' | 'guide' | 'forum';
      id: string;
      title: string;
      excerpt: string;
      coverImage: string | null;
      url: string;
      updatedAt: Date;
    }> = [];

    if (kind === 'all' || kind === 'wiki') {
      const pages = await this.prisma.wikiPage.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perPage,
      });
      for (const page of pages) {
        results.push({
          kind: 'wiki',
          id: page.id,
          title: page.title,
          excerpt: page.excerpt,
          coverImage: page.coverImage ?? extractFirstImage(page.content),
          url: `/wiki/pages/${page.slug}`,
          updatedAt: page.updatedAt,
        });
      }
    }

    if (kind === 'all' || kind === 'guide') {
      const guides = await this.prisma.guide.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perPage,
      });
      for (const guide of guides) {
        results.push({
          kind: 'guide',
          id: guide.id,
          title: guide.title,
          excerpt: guide.excerpt,
          coverImage: guide.coverImage ?? extractFirstImage(guide.content),
          url: `/guides/${guide.slug}`,
          updatedAt: guide.updatedAt,
        });
      }
    }

    if (kind === 'all' || kind === 'forum') {
      const threads = await this.prisma.forumThread.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perPage,
      });
      for (const thread of threads) {
        results.push({
          kind: 'forum',
          id: thread.id,
          title: thread.title,
          excerpt: thread.content.slice(0, 160),
          coverImage: thread.coverImage ?? extractFirstImage(thread.content),
          url: `/forum/threads/${thread.id}`,
          updatedAt: thread.updatedAt,
        });
      }
    }

    const sorted = results.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const start = (page - 1) * perPage;
    const data = sorted.slice(start, start + perPage);
    return {
      data,
      pagination: pageInfo(page, perPage, sorted.length),
    };
  }
}
