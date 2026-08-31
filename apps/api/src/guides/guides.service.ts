import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Guide, User } from '@prisma/client';
import { pageInfo } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';

type GuideWithAuthor = Guide & { author: User };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

function excerpt(content: string): string {
  return content.replace(/[#>*_`~\-[\]()!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function summary(guide: GuideWithAuthor) {
  return {
    id: guide.id,
    slug: guide.slug,
    title: guide.title,
    excerpt: guide.excerpt,
    tags: guide.tags,
    status: guide.status,
    author: toUserSummary(guide.author),
    rating: guide.ratingAvg,
    ratingCount: guide.ratingCount,
    updatedAt: guide.updatedAt,
  };
}

function detail(guide: GuideWithAuthor) {
  return {
    ...summary(guide),
    content: guide.content,
    relatedCharacter: guide.relatedCharacter,
    createdAt: guide.createdAt,
  };
}

@Injectable()
export class GuidesService {
  constructor(private readonly prisma: PrismaService) {}

  private async distribution(guideId: string) {
    const rows = await this.prisma.rating.groupBy({
      by: ['score'],
      where: { guideId },
      _count: true,
    });
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      distribution[row.score as 1 | 2 | 3 | 4 | 5] = row._count;
    }
    return distribution;
  }

  async list(query: {
    tag?: string;
    q?: string;
    status?: ContentStatus;
    sort?: 'rating' | 'updatedAt' | 'createdAt';
    page: number;
    perPage: number;
  }) {
    const where: any = {};
    if (query.tag) where.tags = { has: query.tag };
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const orderBy =
      query.sort === 'rating'
        ? { ratingAvg: 'desc' as const }
        : { [query.sort ?? 'updatedAt']: 'desc' as const };

    const [total, guides] = await this.prisma.$transaction([
      this.prisma.guide.count({ where }),
      this.prisma.guide.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        include: { author: true },
      }),
    ]);
    return {
      data: guides.map(summary),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async create(userId: string, dto: {
    title: string;
    slug?: string;
    content: string;
    tags?: string[];
    status?: 'draft' | 'published';
    relatedCharacter?: string;
  }) {
    const guide = await this.prisma.guide.create({
      data: {
        slug: dto.slug ?? slugify(dto.title),
        title: dto.title,
        content: dto.content,
        excerpt: excerpt(dto.content),
        tags: dto.tags ?? [],
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : 'DRAFT',
        relatedCharacter: dto.relatedCharacter,
        authorId: userId,
      },
      include: { author: true },
    });
    return detail(guide);
  }

  async get(slug: string) {
    const guide = await this.prisma.guide.findUnique({
      where: { slug },
      include: { author: true },
    });
    if (!guide) throw new NotFoundException('guide not found');
    return detail(guide);
  }

  async update(userId: string, slug: string, dto: {
    title?: string;
    content?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
    relatedCharacter?: string;
  }) {
    const existing = await this.prisma.guide.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('guide not found');
    const guide = await this.prisma.guide.update({
      where: { id: existing.id },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content ?? existing.content,
        excerpt: dto.content ? excerpt(dto.content) : existing.excerpt,
        tags: dto.tags ?? existing.tags,
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : existing.status,
        relatedCharacter: dto.relatedCharacter ?? existing.relatedCharacter,
      },
      include: { author: true },
    });
    return detail(guide);
  }

  async delete(slug: string): Promise<void> {
    await this.prisma.guide.delete({ where: { slug } }).catch(() => {
      throw new NotFoundException('guide not found');
    });
  }

  async getRating(slug: string, userId?: string) {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    const myScore = userId
      ? (await this.prisma.rating.findUnique({
          where: { guideId_userId: { guideId: guide.id, userId } },
        }))?.score ?? null
      : null;
    return {
      average: guide.ratingAvg,
      count: guide.ratingCount,
      distribution: await this.distribution(guide.id),
      myScore,
    };
  }

  async rate(userId: string, slug: string, score: number) {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');

    await this.prisma.rating.upsert({
      where: { guideId_userId: { guideId: guide.id, userId } },
      update: { score },
      create: { guideId: guide.id, userId, score },
    });

    const aggregate = await this.prisma.rating.aggregate({
      where: { guideId: guide.id },
      _avg: { score: true },
      _count: true,
    });
    const updated = await this.prisma.guide.update({
      where: { id: guide.id },
      data: {
        ratingAvg: aggregate._avg.score ?? 0,
        ratingCount: aggregate._count,
      },
    });
    return {
      average: updated.ratingAvg,
      count: updated.ratingCount,
      distribution: await this.distribution(guide.id),
      myScore: score,
    };
  }
}
