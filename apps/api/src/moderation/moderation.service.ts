import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageInfo } from '../common/pagination';
import { toUserSummary } from '../users/users.service';

const PER_TYPE = 100;
const TYPES = ['forumThread', 'forumPost', 'comment', 'wikiPage', 'guide'] as const;

interface RawItem {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  authorId: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  private excerptOf(content: string): string {
    return content.replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  async listContent(query: { page: number; perPage: number; type?: string }) {
    if (query.type) {
      const items = await this.loadType(query.type as (typeof TYPES)[number]);
      return this.paginate(items, query.page, query.perPage);
    }
    const grouped = await Promise.all(
      TYPES.map((t) => this.loadType(t)),
    );
    const all = grouped.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.paginate(all, query.page, query.perPage);
  }

  private async loadType(type: (typeof TYPES)[number]): Promise<RawItem[]> {
    const take = PER_TYPE;
    switch (type) {
      case 'forumThread': {
        const rows = await this.prisma.forumThread.findMany({
          take,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, content: true, authorId: true, createdAt: true },
        });
        return rows.map((r) => ({
          id: r.id,
          type,
          title: r.title,
          excerpt: this.excerptOf(r.content),
          authorId: r.authorId,
          status: 'published',
          createdAt: r.createdAt,
        }));
      }
      case 'forumPost': {
        const rows = await this.prisma.forumPost.findMany({
          take,
          orderBy: { createdAt: 'desc' },
          select: { id: true, content: true, authorId: true, createdAt: true },
        });
        return rows.map((r) => ({
          id: r.id,
          type,
          title: '',
          excerpt: this.excerptOf(r.content),
          authorId: r.authorId,
          status: 'published',
          createdAt: r.createdAt,
        }));
      }
      case 'comment': {
        const rows = await this.prisma.comment.findMany({
          take,
          orderBy: { createdAt: 'desc' },
          select: { id: true, content: true, authorId: true, createdAt: true },
        });
        return rows.map((r) => ({
          id: r.id,
          type,
          title: '',
          excerpt: this.excerptOf(r.content),
          authorId: r.authorId,
          status: 'published',
          createdAt: r.createdAt,
        }));
      }
      case 'wikiPage': {
        const rows = await this.prisma.wikiPage.findMany({
          take,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, content: true, authorId: true, status: true, createdAt: true },
        });
        return rows.map((r) => ({
          id: r.id,
          type,
          title: r.title,
          excerpt: this.excerptOf(r.content),
          authorId: r.authorId,
          status: r.status.toLowerCase(),
          createdAt: r.createdAt,
        }));
      }
      case 'guide': {
        const rows = await this.prisma.guide.findMany({
          take,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, content: true, authorId: true, status: true, createdAt: true },
        });
        return rows.map((r) => ({
          id: r.id,
          type,
          title: r.title,
          excerpt: this.excerptOf(r.content),
          authorId: r.authorId,
          status: r.status.toLowerCase(),
          createdAt: r.createdAt,
        }));
      }
    }
  }

  private async paginate(items: RawItem[], page: number, perPage: number) {
    const total = items.length;
    const slice = items.slice((page - 1) * perPage, page * perPage);
    const authorIds = [...new Set(slice.map((i) => i.authorId))];
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a]));
    return {
      data: slice.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        excerpt: i.excerpt,
        author: authorMap.has(i.authorId)
          ? toUserSummary(authorMap.get(i.authorId)!)
          : null,
        status: i.status,
        createdAt: i.createdAt,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }
}
