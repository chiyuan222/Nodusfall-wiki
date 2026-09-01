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
import { levelFromExp, nextLevelExp } from '../exp/exp.service';

export type PublicUser = Omit<User, 'passwordHash'>;

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'guest' | 'member' | 'editor' | 'moderator' | 'admin';
  createdAt: Date;
  status: 'active' | 'deleted';
  group: 'normal' | 'verified' | 'premium';
  level: number;
}

export interface UserResponse extends UserSummary {
  bio: string | null;
  updatedAt: Date;
  emailMasked: string | null;
  phoneMasked: string | null;
  permissions: string[];
  wikiCreateGranted: boolean;
  banReason: string | null;
  banUntil: Date | null;
  mutedUntil: Date | null;
  exp: number;
  nextLevelExp: number | null;
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
    group: user.group.toLowerCase() as UserSummary['group'],
    level: user.level,
  };
}

export function toUserResponse(user: User): UserResponse {
  return {
    ...toUserSummary(user),
    bio: user.bio,
    updatedAt: user.updatedAt,
    emailMasked: maskEmail(user.email),
    phoneMasked: maskPhone(user.phone),
    permissions: user.permissions,
    wikiCreateGranted: user.wikiCreateGranted,
    banReason: user.banReason,
    banUntil: user.banUntil,
    mutedUntil: user.mutedUntil,
    exp: user.exp,
    nextLevelExp: nextLevelExp(levelFromExp(user.exp)),
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

  async listAdminUsers(query: {
    q?: string;
    group?: string;
    role?: string;
    status?: string;
    level?: number;
    page: number;
    perPage: number;
  }) {
    const where: Record<string, unknown> = {};
    if (query.q) {
      where.OR = [
        { username: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
      ];
    }
    if (query.group) where.group = query.group.toUpperCase();
    if (query.role) where.role = query.role.toUpperCase();
    if (query.status) where.status = query.status.toUpperCase();
    if (query.level) where.level = query.level;

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        revokedAt: null,
        lastActiveAt: { not: null },
      },
      select: { userId: true, lastActiveAt: true },
      orderBy: { lastActiveAt: 'desc' },
    });
    const lastActive = new Map<string, Date | null>();
    for (const s of sessions) {
      if (!lastActive.has(s.userId)) lastActive.set(s.userId, s.lastActiveAt);
    }
    return {
      data: users.map((u) => ({
        ...toUserResponse(u),
        email: u.email,
        phone: u.phone,
        lastActiveAt: lastActive.get(u.id) ?? null,
      })),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async getAdminUser(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('user not found');
    const lastSession = await this.prisma.session.findFirst({
      where: { userId: id, revokedAt: null },
      orderBy: { lastActiveAt: 'desc' },
      select: { lastActiveAt: true },
    });
    return {
      ...toUserResponse(user),
      email: user.email,
      phone: user.phone,
      lastActiveAt: lastSession?.lastActiveAt ?? null,
    };
  }

  async updateAdminUser(
    id: string,
    dto: {
      group?: string;
      level?: number;
      status?: string;
      banReason?: string;
      banUntil?: string | null;
      mutedUntil?: string | null;
      wikiCreateGranted?: boolean;
      permissions?: string[];
      role?: string;
    },
  ) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('user not found');

    const data: Record<string, unknown> = {};
    if (dto.group) data.group = dto.group.toUpperCase();
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.status) {
      data.status = dto.status.toUpperCase();
      if (dto.status === 'banned') {
        data.banReason = dto.banReason ?? user.banReason;
        data.banUntil = dto.banUntil ?? null;
      } else if (dto.status === 'muted') {
        data.mutedUntil = dto.mutedUntil ?? null;
      } else if (dto.status === 'active') {
        data.banReason = null;
        data.banUntil = null;
        data.mutedUntil = null;
      }
    }
    if (dto.wikiCreateGranted !== undefined) data.wikiCreateGranted = dto.wikiCreateGranted;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.role) data.role = dto.role.toUpperCase();

    await this.prisma.user.update({ where: { id }, data });
    if (dto.status === 'banned') {
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return this.getAdminUser(id);
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
