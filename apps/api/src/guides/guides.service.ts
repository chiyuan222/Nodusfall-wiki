import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Guide, GuideCategory, User } from '@prisma/client';
import { pageInfo } from '../common/pagination';
import { extractFirstImage } from '../common/markdown';
import { hasBoardPermission, isManagerRole } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';
import { ExpService } from '../exp/exp.service';
import { TextFilterService } from '../moderation/text-filter.service';

type GuideWithAuthor = Guide & { author: User; category?: GuideCategory | null };

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

function summary(
  guide: GuideWithAuthor,
  likedByMe = false,
  bookmarkedByMe = false,
  dislikedByMe = false,
) {
  return {
    id: guide.id,
    slug: guide.slug,
    title: guide.title,
    excerpt: guide.excerpt,
    coverImage: guide.coverImage ?? extractFirstImage(guide.content),
    tags: guide.tags,
    status: guide.status.toLowerCase(),
    author: toUserSummary(guide.author),
    rating: guide.ratingAvg,
    ratingCount: guide.ratingCount,
    updatedAt: guide.updatedAt,
    viewCount: guide.viewCount,
    likeCount: guide.likeCount,
    dislikeCount: guide.dislikeCount,
    categorySlug: guide.category?.slug ?? null,
    likedByMe,
    bookmarkedByMe,
    dislikedByMe,
  };
}

function detail(
  guide: GuideWithAuthor,
  likedByMe = false,
  bookmarkedByMe = false,
  dislikedByMe = false,
) {
  return {
    ...summary(guide, likedByMe, bookmarkedByMe, dislikedByMe),
    content: guide.content,
    relatedCharacter: guide.relatedCharacter,
    createdAt: guide.createdAt,
    featuredAt: guide.featuredAt,
  };
}

@Injectable()
export class GuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expService: ExpService,
    private readonly textFilter: TextFilterService,
  ) {}

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
    category?: string;
    q?: string;
    status?: ContentStatus;
    sort?: 'rating' | 'updatedAt' | 'createdAt';
    page: number;
    perPage: number;
  }, userId?: string) {
    const where: any = {};
    if (query.tag) where.tags = { has: query.tag };
    if (query.category) where.category = { slug: query.category };
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
        include: { author: true, category: true },
      }),
    ]);
    const { likes, bookmarks, dislikes } = await this.interactions(
      guides.map((g) => g.id),
      userId,
    );
    return {
      data: guides.map((g) =>
        summary(g, likes.has(g.id), bookmarks.has(g.id), dislikes.has(g.id)),
      ),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async create(
    userId: string,
    dto: {
    title: string;
    slug?: string;
    content: string;
    categorySlug?: string;
    tags?: string[];
    status?: 'draft' | 'published';
    relatedCharacter?: string;
    coverImage?: string | null;
    },
    auth?: {
      role: string;
      permissions: string[];
      status: string;
      wikiCreateGranted?: boolean;
      guideCreateGranted?: boolean;
    },
  ) {
    if (auth?.status === 'MUTED' || auth?.status === 'BANNED') {
      throw new ForbiddenException('account restricted');
    }
    if (
      !auth?.wikiCreateGranted &&
      !auth?.guideCreateGranted &&
      !isManagerRole(auth?.role)
    ) {
      throw new ForbiddenException('guide create not granted');
    }
    await this.textFilter.assertSafe(`${dto.title}\n${dto.content}`);
    let categoryId: string | null = null;
    if (dto.categorySlug) {
      const cat = await this.prisma.guideCategory.findUnique({
        where: { slug: dto.categorySlug },
      });
      if (!cat) throw new NotFoundException('category not found');
      categoryId = cat.id;
    } else {
      const def = await this.prisma.guideCategory.findUnique({
        where: { slug: 'general' },
      });
      categoryId = def?.id ?? null;
    }
    const guide = await this.prisma.guide.create({
      data: {
        slug: dto.slug ?? slugify(dto.title),
        title: dto.title,
        content: dto.content,
        excerpt: excerpt(dto.content),
        coverImage: dto.coverImage ?? extractFirstImage(dto.content),
        tags: dto.tags ?? [],
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : 'DRAFT',
        relatedCharacter: dto.relatedCharacter,
        categoryId,
        authorId: userId,
      },
      include: { author: true, category: true },
    });
    void this.expService.grant(userId, "guide", guide.id);
    return detail(guide);
  }

  async get(slug: string, userId?: string) {
    await this.prisma.guide.updateMany({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
    const guide = await this.prisma.guide.findUnique({
      where: { slug },
      include: { author: true, category: true },
    });
    if (!guide) throw new NotFoundException('guide not found');
    const { likes, bookmarks, dislikes } = await this.interactions([guide.id], userId);
    return detail(guide, likes.has(guide.id), bookmarks.has(guide.id), dislikes.has(guide.id));
  }

  async update(
    userId: string,
    slug: string,
    dto: {
    title?: string;
    content?: string;
    categorySlug?: string | null;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
    relatedCharacter?: string;
    coverImage?: string | null;
    featured?: boolean;
    featuredAt?: string | null;
    },
    auth?: { role: string; permissions: string[] },
  ) {
    if (dto.title !== undefined || dto.content !== undefined) {
      await this.textFilter.assertSafe(
        `${dto.title ?? ''}\n${dto.content ?? ''}`,
      );
    }
    const existing = await this.prisma.guide.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('guide not found');
    if (
      existing.authorId !== userId &&
      !hasBoardPermission(auth?.role, auth?.permissions, 'guide')
    ) {
      throw new ForbiddenException('not your guide');
    }
    let categoryId = existing.categoryId;
    if (dto.categorySlug !== undefined) {
      if (dto.categorySlug === null) {
        categoryId = null;
      } else {
        const cat = await this.prisma.guideCategory.findUnique({
          where: { slug: dto.categorySlug },
        });
        if (!cat) throw new NotFoundException('category not found');
        categoryId = cat.id;
      }
    }
    const guide = await this.prisma.guide.update({
      where: { id: existing.id },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content ?? existing.content,
        excerpt: dto.content ? excerpt(dto.content) : existing.excerpt,
        coverImage: dto.coverImage !== undefined ? dto.coverImage : extractFirstImage(dto.content ?? existing.content),
        tags: dto.tags ?? existing.tags,
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : existing.status,
        relatedCharacter: dto.relatedCharacter ?? existing.relatedCharacter,
        categoryId,
        featuredAt: dto.featuredAt
          ? new Date(dto.featuredAt)
          : dto.featured === true
            ? new Date()
            : dto.featured === false
              ? null
              : existing.featuredAt,
      },
      include: { author: true, category: true },
    });
    void this.expService.grant(userId, "guide", guide.id);
    return detail(guide);
  }

  async delete(
    userId: string,
    slug: string,
    auth?: { role: string; permissions: string[] },
  ): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) {
      throw new NotFoundException('guide not found');
    }
    if (
      guide.authorId !== userId &&
      !hasBoardPermission(auth?.role, auth?.permissions, 'guide')
    ) {
      throw new ForbiddenException('not your guide');
    }
    await this.prisma.rating.deleteMany({ where: { guideId: guide.id } });
    await this.prisma.comment.deleteMany({
      where: { targetType: 'GUIDE', targetId: guide.id },
    });
    await this.prisma.guide.delete({ where: { id: guide.id } });
  }

  async listGuideCategories() {
    const data = await this.prisma.guideCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { data };
  }

  async createGuideCategory(dto: {
    slug: string;
    name: string;
    description?: string;
    sortOrder: number;
  }) {
    const existing = await this.prisma.guideCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('分类 slug 已存在');
    const cat = await this.prisma.guideCategory.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder,
      },
    });
    return cat;
  }

  async updateGuideCategory(
    slug: string,
    dto: { name?: string; description?: string; sortOrder?: number },
  ) {
    const cat = await this.prisma.guideCategory.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('category not found');
    return this.prisma.guideCategory.update({
      where: { id: cat.id },
      data: {
        name: dto.name ?? cat.name,
        description:
          dto.description !== undefined ? dto.description : cat.description,
        sortOrder: dto.sortOrder ?? cat.sortOrder,
      },
    });
  }

  async deleteGuideCategory(slug: string): Promise<void> {
    const cat = await this.prisma.guideCategory.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('category not found');
    const count = await this.prisma.guide.count({
      where: { categoryId: cat.id },
    });
    if (count > 0) {
      throw new ConflictException('分类下仍有攻略，不能删除');
    }
    await this.prisma.guideCategory.delete({ where: { id: cat.id } });
  }

  async likeGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    const existing = await this.prisma.guideLike.findUnique({
      where: { guideId_userId: { guideId: guide.id, userId } },
    });
    if (!existing) {
      await this.prisma.guideLike.create({
        data: { guideId: guide.id, userId },
      });
      await this.prisma.guide.update({
        where: { id: guide.id },
        data: { likeCount: { increment: 1 } },
      });
      void this.expService.grant(userId, "like", guide.id);
    }
  }

  async unlikeGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    const result = await this.prisma.guideLike.deleteMany({
      where: { guideId: guide.id, userId },
    });
    if (result.count > 0) {
      await this.prisma.guide.update({
        where: { id: guide.id },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  async dislikeGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    const existing = await this.prisma.guideDislike.findUnique({
      where: { guideId_userId: { guideId: guide.id, userId } },
    });
    if (!existing) {
      await this.prisma.guideDislike.create({
        data: { guideId: guide.id, userId },
      });
      await this.prisma.guide.update({
        where: { id: guide.id },
        data: { dislikeCount: { increment: 1 } },
      });
    }
  }

  async undislikeGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    const result = await this.prisma.guideDislike.deleteMany({
      where: { guideId: guide.id, userId },
    });
    if (result.count > 0) {
      await this.prisma.guide.update({
        where: { id: guide.id },
        data: { dislikeCount: { decrement: 1 } },
      });
    }
  }

  async bookmarkGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    await this.prisma.guideBookmark.upsert({
      where: { guideId_userId: { guideId: guide.id, userId } },
      create: { guideId: guide.id, userId },
      update: {},
    });
    void this.expService.grant(userId, "bookmark", guide.id);
  }

  async unbookmarkGuide(userId: string, slug: string): Promise<void> {
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    await this.prisma.guideBookmark.deleteMany({
      where: { guideId: guide.id, userId },
    });
  }

  private async interactions(guideIds: string[], userId?: string) {
    if (!userId || guideIds.length === 0) {
      return {
        likes: new Set<string>(),
        bookmarks: new Set<string>(),
        dislikes: new Set<string>(),
      };
    }
    const [likes, bookmarks, dislikes] = await Promise.all([
      this.prisma.guideLike.findMany({
        where: { guideId: { in: guideIds }, userId },
        select: { guideId: true },
      }),
      this.prisma.guideBookmark.findMany({
        where: { guideId: { in: guideIds }, userId },
        select: { guideId: true },
      }),
      this.prisma.guideDislike.findMany({
        where: { guideId: { in: guideIds }, userId },
        select: { guideId: true },
      }),
    ]);
    return {
      likes: new Set(likes.map((l) => l.guideId)),
      bookmarks: new Set(bookmarks.map((b) => b.guideId)),
      dislikes: new Set(dislikes.map((d) => d.guideId)),
    };
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
