import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailCodeService } from '../auth/email-code.service';
import { pageInfo } from '../common/pagination';
import { RegisterDto } from './dto/register.dto';

export type PublicUser = Omit<User, 'passwordHash'>;

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'guest' | 'member' | 'editor' | 'moderator' | 'admin';
  createdAt: Date;
  status: 'active' | 'deleted';
}

export interface UserResponse extends UserSummary {
  bio: string | null;
  updatedAt: Date;
  emailMasked: string | null;
  phoneMasked: string | null;
}

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    role: user.role.toLowerCase() as UserSummary['role'],
    createdAt: user.createdAt,
    status: user.status.toLowerCase() as UserSummary['status'],
  };
}

export function toUserResponse(user: User): UserResponse {
  return {
    ...toUserSummary(user),
    bio: user.bio,
    updatedAt: user.updatedAt,
    emailMasked: maskEmail(user.email),
    phoneMasked: maskPhone(user.phone),
  };
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local.slice(0, 1)}***${domain}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailCodeService: EmailCodeService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async update(id: string, data: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async register(dto: RegisterDto): Promise<User> {
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    const or: Array<{ email?: string; phone?: string; username?: string }> = [
      { username: dto.username },
    ];
    if (email) or.push({ email });
    if (phone) or.push({ phone });

    const existing = await this.prisma.user.findFirst({ where: { OR: or } });
    if (existing) {
      throw new ConflictException('邮箱、手机号或用户名已存在');
    }

    if (email) {
      const ok = await this.emailCodeService.verify(email, dto.emailCode ?? '');
      if (!ok) {
        throw new BadRequestException('验证码无效或已过期');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: email ?? null,
        phone: phone ?? null,
        username: dto.username,
        displayName: dto.username,
        passwordHash,
        emailVerifiedAt: email ? new Date() : null,
      },
    });
  }

  async deactivate(userId: string, password: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('密码不正确');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'DELETED' },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async myComments(userId: string, page: number, perPage: number) {
    const where = { authorId: userId };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const wikiIds = comments
      .filter((c) => c.targetType === 'WIKI_PAGE')
      .map((c) => c.targetId);
    const guideIds = comments
      .filter((c) => c.targetType === 'GUIDE')
      .map((c) => c.targetId);
    const [pages, guides] = await Promise.all([
      wikiIds.length
        ? this.prisma.wikiPage.findMany({
            where: { id: { in: wikiIds } },
            select: { id: true, slug: true, title: true },
          })
        : Promise.resolve([]),
      guideIds.length
        ? this.prisma.guide.findMany({
            where: { id: { in: guideIds } },
            select: { id: true, slug: true, title: true },
          })
        : Promise.resolve([]),
    ]);
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    const guideMap = new Map(guides.map((g) => [g.id, g]));

    return {
      data: comments.map((c) => {
        const target =
          c.targetType === 'WIKI_PAGE'
            ? pageMap.get(c.targetId)
            : guideMap.get(c.targetId);
        return {
          id: c.id,
          targetType: c.targetType === 'WIKI_PAGE' ? 'wiki_page' : 'guide',
          targetSlug: target?.slug ?? '',
          targetTitle: target?.title ?? '（内容已删除）',
          content: c.content,
          likeCount: c.likeCount,
          createdAt: c.createdAt,
        };
      }),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async recordHistory(
    userId: string,
    kind: 'wikiPage' | 'guide' | 'forumThread',
    slug: string,
  ): Promise<Record<string, unknown>> {
    let title = '';
    let boardSlug: string | null = null;
    let coverImage: string | null = null;
    let excerpt: string | null = null;

    if (kind === 'wikiPage') {
      const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
      if (!page) throw new NotFoundException('page not found');
      title = page.title;
      coverImage = page.coverImage;
      excerpt = page.excerpt;
    } else if (kind === 'guide') {
      const guide = await this.prisma.guide.findUnique({ where: { slug } });
      if (!guide) throw new NotFoundException('guide not found');
      title = guide.title;
      coverImage = guide.coverImage;
      excerpt = guide.excerpt;
    } else {
      const thread = await this.prisma.forumThread.findUnique({
        where: { id: slug },
        include: { board: { select: { slug: true } } },
      });
      if (!thread) throw new NotFoundException('thread not found');
      title = thread.title;
      boardSlug = thread.board.slug;
      coverImage = thread.coverImage;
      excerpt = thread.content.slice(0, 160);
    }

    const now = new Date();
    const entry = await this.prisma.browseHistory.upsert({
      where: { userId_kind_slug: { userId, kind, slug } },
      create: {
        userId,
        kind,
        slug,
        title,
        boardSlug,
        coverImage,
        excerpt,
        viewedAt: now,
      },
      update: { title, boardSlug, coverImage, excerpt, viewedAt: now },
    });
    await this.pruneHistory(userId);
    return {
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      slug: entry.slug,
      boardSlug: entry.boardSlug,
      coverImage: entry.coverImage,
      excerpt: entry.excerpt,
      viewedAt: entry.viewedAt,
    };
  }

  async historyList(userId: string, page: number, perPage: number) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.browseHistory.count({ where }),
      this.prisma.browseHistory.findMany({
        where,
        orderBy: { viewedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return {
      data: items.map((h) => ({
        id: h.id,
        kind: h.kind,
        title: h.title,
        slug: h.slug,
        boardSlug: h.boardSlug,
        coverImage: h.coverImage,
        excerpt: h.excerpt,
        viewedAt: h.viewedAt,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async clearHistory(userId: string): Promise<void> {
    await this.prisma.browseHistory.deleteMany({ where: { userId } });
  }

  private async pruneHistory(userId: string): Promise<void> {
    const rows = await this.prisma.browseHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      select: { id: true },
      take: 101,
    });
    if (rows.length <= 100) return;
    const removeIds = rows.slice(100).map((r) => r.id);
    await this.prisma.browseHistory.deleteMany({
      where: { id: { in: removeIds } },
    });
  }
}
