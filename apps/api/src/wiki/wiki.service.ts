import {
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
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';

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

function pageSummary(page: PageWithRelations) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt,
    categorySlug: page.category.slug,
    tags: page.tags,
    status: page.status,
    author: toUserSummary(page.author),
    updatedAt: page.updatedAt,
  };
}

function pageDetail(page: PageWithRelations) {
  return {
    ...pageSummary(page),
    content: page.content,
    version: page.version,
    createdAt: page.createdAt,
    revisionCount: page._count?.revisions ?? 0,
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
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.wikiCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listPages(query: {
    category?: string;
    tag?: string;
    q?: string;
    status?: ContentStatus;
    page: number;
    perPage: number;
    sort?: 'updatedAt' | 'createdAt' | 'title';
  }) {
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
    return {
      data: pages.map(pageSummary),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async createPage(userId: string, dto: {
    title: string;
    slug?: string;
    categorySlug: string;
    tags?: string[];
    content: string;
    status?: 'draft' | 'published';
    changelog?: string;
  }) {
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
    return pageDetail({ ...page, _count: { revisions: 1 } });
  }

  async getPage(slug: string) {
    const page = await this.prisma.wikiPage.findUnique({
      where: { slug },
      include: { author: true, category: true, _count: { select: { revisions: true } } },
    });
    if (!page) throw new NotFoundException('page not found');
    return pageDetail(page);
  }

  async updatePage(userId: string, slug: string, dto: {
    title?: string;
    categorySlug?: string;
    tags?: string[];
    content?: string;
    status?: 'draft' | 'published' | 'archived';
    changelog?: string;
  }) {
    const existing = await this.prisma.wikiPage.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('page not found');

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
        categoryId,
        tags: dto.tags ?? existing.tags,
        status: dto.status ? (dto.status.toUpperCase() as ContentStatus) : existing.status,
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
    return pageDetail(page);
  }

  async deletePage(slug: string): Promise<void> {
    await this.prisma.wikiPage.delete({ where: { slug } }).catch(() => {
      throw new NotFoundException('page not found');
    });
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
