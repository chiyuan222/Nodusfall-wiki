import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentStatus,
  User,
  WikiCategory,
  WikiPage,
  WikiPageRevision,
} from '@prisma/client';
import { pageInfo } from '../common/pagination';
import { extractFirstImage } from '../common/markdown';
import { hasPermission, isManagerRole, PERMISSIONS } from '../common/roles';
import { TextFilterService } from '../moderation/text-filter.service';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';
import { ExpService } from '../exp/exp.service';

type PageWithRelations = WikiPage & {
  author: User;
  category: WikiCategory;
  _count?: { revisions: number };
};

type RevisionWithAuthor = WikiPageRevision & { author: User };

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

function pageSummary(
  page: PageWithRelations,
  likedByMe = false,
  bookmarkedByMe = false,
) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt,
    coverImage: page.coverImage ?? extractFirstImage(page.content),
    categorySlug: page.category.slug,
    tags: page.tags,
    status: page.status.toLowerCase(),
    author: toUserSummary(page.author),
    updatedAt: page.updatedAt,
    viewCount: page.viewCount,
    likeCount: page.likeCount,
    likedByMe,
    bookmarkedByMe,
  };
}

function pageDetail(
  page: PageWithRelations,
  likedByMe = false,
  bookmarkedByMe = false,
) {
  return {
    ...pageSummary(page, likedByMe, bookmarkedByMe),
    content: page.content,
    version: page.version,
    createdAt: page.createdAt,
    revisionCount: page._count?.revisions ?? 0,
    featuredAt: page.featuredAt,
  };
}

function revisionView(revision: RevisionWithAuthor) {
  return {
    id: revision.id,
    pageId: revision.pageId,
    version: revision.version,
    title: revision.title,
    content: revision.content,
    changelog: revision.changelog,
    author: toUserSummary(revision.author),
    createdAt: revision.createdAt,
  };
}

@Injectable()
export class WikiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expService: ExpService,
    private readonly textFilter: TextFilterService,
  ) {}

  listCategories() {
    return this.prisma.wikiCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: {
    slug: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }) {
    const existing = await this.prisma.wikiCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('category slug already exists');
    }
    return this.prisma.wikiCategory.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(slug: string, dto: {
    name?: string;
    description?: string;
    sortOrder?: number;
  }) {
    const category = await this.prisma.wikiCategory.findUnique({ where: { slug } });
    if (!category) {
      throw new NotFoundException('category not found');
    }
    return this.prisma.wikiCategory.update({
      where: { id: category.id },
      data: {
        name: dto.name ?? category.name,
        description: dto.description ?? category.description,
        sortOrder: dto.sortOrder ?? category.sortOrder,
      },
    });
  }

  async deleteCategory(slug: string): Promise<void> {
    const category = await this.prisma.wikiCategory.findUnique({ where: { slug } });
    if (!category) {
      throw new NotFoundException('category not found');
    }
    const count = await this.prisma.wikiPage.count({
      where: { categoryId: category.id },
    });
    if (count > 0) {
      throw new ConflictException('category is not empty');
    }
    await this.prisma.wikiCategory.delete({ where: { id: category.id } });
  }

  async listPages(query: {
    category?: string;
    tag?: string;
    q?: string;
    status?: ContentStatus;
    page: number;
    perPage: number;
    sort?: 'updatedAt' | 'createdAt' | 'title';
  }, userId?: string) {
    const where: any = {};
    if (query.category) where.category = { slug: query.category };
    if (query.tag) where.tags = { has: query.tag };
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const orderBy =
      query.sort === 'title'
        ? { title: 'asc' as const }
        : { [query.sort ?? 'updatedAt']: 'desc' as const };

    const [total, pages] = await this.prisma.$transaction([
      this.prisma.wikiPage.count({ where }),
      this.prisma.wikiPage.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        include: { author: true, category: true },
      }),
    ]);
    const { likes, bookmarks } = await this.pageInteractions(
      pages.map((p) => p.id),
      userId,
    );
    return {
      data: pages.map((p) =>
        pageSummary(p, likes.has(p.id), bookmarks.has(p.id)),
      ),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async createPage(
    userId: string,
    dto: {
    title: string;
    slug?: string;
    categorySlug: string;
    tags?: string[];
    content: string;
    status?: 'draft' | 'published';
    changelog?: string;
    coverImage?: string | null;
    },
    auth?: { role: string; permissions: string[]; status: string; wikiCreateGranted?: boolean },
  ) {
    if (auth?.status === 'MUTED' || auth?.status === 'BANNED') {
      throw new ForbiddenException('account restricted');
    }
    if (
      !auth?.wikiCreateGranted &&
      !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_CONTENT)
    ) {
      throw new ForbiddenException('wiki create not granted');
    }
    await this.textFilter.assertSafe(`${dto.title}\n${dto.content}`);
    const category = await this.prisma.wikiCategory.findUnique({
      where: { slug: dto.categorySlug },
    });
    if (!category) {
      throw new NotFoundException('category not found');
    }
    const slug = dto.slug ?? slugify(dto.title);
    const page = await this.prisma.wikiPage.create({
      data: {
        slug,
        title: dto.title,
        content: dto.content,
        excerpt: excerpt(dto.content),
        coverImage: dto.coverImage ?? extractFirstImage(dto.content),
        categoryId: category.id,
        tags: dto.tags ?? [],
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : 'DRAFT',
        authorId: userId,
        version: 1,
        revisions: {
          create: {
            version: 1,
            title: dto.title,
            content: dto.content,
            changelog: dto.changelog,
            authorId: userId,
          },
        },
      },
      include: { author: true, category: true },
    });
    void this.expService.grant(userId, "wiki", page.id);
    return pageDetail({ ...page, _count: { revisions: 1 } });
  }

  async getPage(slug: string, userId?: string) {
    await this.prisma.wikiPage.updateMany({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
    const page = await this.prisma.wikiPage.findUnique({
      where: { slug },
      include: { author: true, category: true, _count: { select: { revisions: true } } },
    });
    if (!page) throw new NotFoundException('page not found');
    const { likes, bookmarks } = await this.pageInteractions([page.id], userId);
    return pageDetail(page, likes.has(page.id), bookmarks.has(page.id));
  }

  async updatePage(
    userId: string,
    slug: string,
    dto: {
    title?: string;
    categorySlug?: string;
    tags?: string[];
    content?: string;
    status?: 'draft' | 'published' | 'archived';
    changelog?: string;
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
    const existing = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('page not found');
    if (
      existing.authorId !== userId &&
      !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_CONTENT)
    ) {
      throw new ForbiddenException('not your page');
    }

    let categoryId = existing.categoryId;
    if (dto.categorySlug) {
      const category = await this.prisma.wikiCategory.findUnique({
        where: { slug: dto.categorySlug },
      });
      if (!category) throw new NotFoundException('category not found');
      categoryId = category.id;
    }

    const nextVersion = existing.version + 1;
    const title = dto.title ?? existing.title;
    const content = dto.content ?? existing.content;
    const page = await this.prisma.wikiPage.update({
      where: { id: existing.id },
      data: {
        title,
        content,
        excerpt: excerpt(content),
        coverImage: dto.coverImage !== undefined ? dto.coverImage : extractFirstImage(content),
        categoryId,
        tags: dto.tags ?? existing.tags,
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : existing.status,
        featuredAt: dto.featuredAt
          ? new Date(dto.featuredAt)
          : dto.featured === true
            ? new Date()
            : dto.featured === false
              ? null
              : existing.featuredAt,
        version: nextVersion,
        revisions: {
          create: {
            version: nextVersion,
            title,
            content,
            changelog: dto.changelog,
            authorId: userId,
          },
        },
      },
      include: { author: true, category: true, _count: { select: { revisions: true } } },
    });
    void this.expService.grant(userId, "wiki", page.id);
    return pageDetail(page);
  }

  async deletePage(
    userId: string,
    slug: string,
    auth?: { role: string; permissions: string[] },
  ): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!page) {
      throw new NotFoundException('page not found');
    }
    if (
      page.authorId !== userId &&
      !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_DELETION)
    ) {
      throw new ForbiddenException('not your page');
    }
    await this.prisma.comment.deleteMany({
      where: { targetType: 'WIKI_PAGE', targetId: page.id },
    });
    await this.prisma.wikiPageRevision.deleteMany({ where: { pageId: page.id } });
    await this.prisma.wikiPage.delete({ where: { id: page.id } });
  }

  async likePage(userId: string, slug: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('page not found');
    const existing = await this.prisma.wikiPageLike.findUnique({
      where: { pageId_userId: { pageId: page.id, userId } },
    });
    if (!existing) {
      await this.prisma.wikiPageLike.create({
        data: { pageId: page.id, userId },
      });
      await this.prisma.wikiPage.update({
        where: { id: page.id },
        data: { likeCount: { increment: 1 } },
      });
      void this.expService.grant(userId, "like", page.id);
    }
  }

  async unlikePage(userId: string, slug: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('page not found');
    const result = await this.prisma.wikiPageLike.deleteMany({
      where: { pageId: page.id, userId },
    });
    if (result.count > 0) {
      await this.prisma.wikiPage.update({
        where: { id: page.id },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  async bookmarkPage(userId: string, slug: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('page not found');
    await this.prisma.wikiPageBookmark.upsert({
      where: { pageId_userId: { pageId: page.id, userId } },
      create: { pageId: page.id, userId },
      update: {},
    });
    void this.expService.grant(userId, "bookmark", page.id);
  }

  async unbookmarkPage(userId: string, slug: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('page not found');
    await this.prisma.wikiPageBookmark.deleteMany({
      where: { pageId: page.id, userId },
    });
  }

  private async pageInteractions(pageIds: string[], userId?: string) {
    if (!userId || pageIds.length === 0) {
      return { likes: new Set<string>(), bookmarks: new Set<string>() };
    }
    const [likes, bookmarks] = await Promise.all([
      this.prisma.wikiPageLike.findMany({
        where: { pageId: { in: pageIds }, userId },
        select: { pageId: true },
      }),
      this.prisma.wikiPageBookmark.findMany({
        where: { pageId: { in: pageIds }, userId },
        select: { pageId: true },
      }),
    ]);
    return {
      likes: new Set(likes.map((l) => l.pageId)),
      bookmarks: new Set(bookmarks.map((b) => b.pageId)),
    };
  }

  async listRevisions(slug: string, page: number, perPage: number) {
    const wikiPage = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!wikiPage) throw new NotFoundException('page not found');
    const [total, revisions] = await this.prisma.$transaction([
      this.prisma.wikiPageRevision.count({ where: { pageId: wikiPage.id } }),
      this.prisma.wikiPageRevision.findMany({
        where: { pageId: wikiPage.id },
        orderBy: { version: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    return {
      data: revisions.map(revisionView),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async getRevision(slug: string, revisionId: string) {
    const wikiPage = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!wikiPage) throw new NotFoundException('page not found');
    const revision = await this.prisma.wikiPageRevision.findFirst({
      where: { id: revisionId, pageId: wikiPage.id },
      include: { author: true },
    });
    if (!revision) throw new NotFoundException('revision not found');
    return revisionView(revision);
  }
}
