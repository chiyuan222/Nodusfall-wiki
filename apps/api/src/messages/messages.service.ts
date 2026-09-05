import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pageInfo } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';
import { TextFilterService } from '../moderation/text-filter.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textFilter: TextFilterService,
  ) {}

  async list(userId: string, page: number, perPage: number) {
    const dmWhere = {
      OR: [{ recipientId: userId }, { senderId: userId }],
    };
    const [directTotal, directMsgs, announcements, reads] = await Promise.all([
      this.prisma.directMessage.count({ where: dmWhere }),
      this.prisma.directMessage.findMany({
        where: dmWhere,
        orderBy: { createdAt: 'desc' },
        include: { sender: true },
      }),
      this.prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      }),
      this.prisma.announcementRead.findMany({
        where: { userId },
        select: { announcementId: true, readAt: true },
      }),
    ]);
    const readMap = new Map(reads.map((r) => [r.announcementId, r.readAt]));

    const items = [
      ...directMsgs.map((m) => ({
        id: m.id,
        kind: 'direct' as const,
        sender: toUserSummary(m.sender),
        title: null,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
      ...announcements.map((a) => ({
        id: a.id,
        kind: 'announcement' as const,
        sender: toUserSummary(a.author),
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
        readAt: readMap.get(a.id) ?? null,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = directTotal + announcements.length;
    const start = (page - 1) * perPage;
    return {
      data: items.slice(start, start + perPage),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async unreadCount(userId: string) {
    const [directUnread, announcementTotal, readCount] = await Promise.all([
      this.prisma.directMessage.count({
        where: { recipientId: userId, readAt: null },
      }),
      this.prisma.announcement.count(),
      this.prisma.announcementRead.count({ where: { userId } }),
    ]);
    return { unread: directUnread + Math.max(0, announcementTotal - readCount) };
  }

  async send(senderId: string, dto: { recipientId: string; content: string }) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('cannot message yourself');
    }
    await this.textFilter.assertSafe(dto.content);
    const [sender, recipient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderId } }),
      this.prisma.user.findUnique({ where: { id: dto.recipientId } }),
    ]);
    if (!recipient) throw new NotFoundException('recipient not found');
    if (sender?.role !== 'OWNER' && recipient.role !== 'OWNER') {
      throw new ForbiddenException('direct message allowed between owner and users only');
    }
    const msg = await this.prisma.directMessage.create({
      data: { senderId, recipientId: dto.recipientId, content: dto.content },
      include: { sender: true },
    });
    return {
      id: msg.id,
      kind: 'direct' as const,
      sender: toUserSummary(msg.sender),
      title: null,
      content: msg.content,
      createdAt: msg.createdAt,
      readAt: msg.readAt,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.directMessage.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    const [announcements, existing] = await Promise.all([
      this.prisma.announcement.findMany({ select: { id: true } }),
      this.prisma.announcementRead.findMany({
        where: { userId },
        select: { announcementId: true },
      }),
    ]);
    const existingSet = new Set(existing.map((e) => e.announcementId));
    const toCreate = announcements
      .filter((a) => !existingSet.has(a.id))
      .map((a) => ({ announcementId: a.id, userId }));
    if (toCreate.length > 0) {
      await this.prisma.announcementRead.createMany({ data: toCreate });
    }
  }

  /**
   * 账号状态变更站内通知（管理端操作触发）。
   * 直接写入 DirectMessage 而不走 send() 的「仅站长可私信」约束：
   * 该方法仅供后端管理流程内部调用，不暴露为可随意私信用户的通道。
   */
  async notifyUserChange(operatorId: string, recipientId: string, content: string) {
    const msg = await this.prisma.directMessage.create({
      data: { senderId: operatorId, recipientId, content },
      include: { sender: true },
    });
    return {
      id: msg.id,
      kind: 'direct' as const,
      sender: toUserSummary(msg.sender),
      title: null,
      content: msg.content,
      createdAt: msg.createdAt,
      readAt: msg.readAt,
    };
  }

  async createAnnouncement(ownerId: string, dto: { title: string; content: string }) {
    const a = await this.prisma.announcement.create({
      data: { authorId: ownerId, title: dto.title, content: dto.content },
      include: { author: true },
    });
    return {
      id: a.id,
      kind: 'announcement' as const,
      sender: toUserSummary(a.author),
      title: a.title,
      content: a.content,
      createdAt: a.createdAt,
      readAt: null,
    };
  }

  async listAnnouncements(page: number, perPage: number) {
    const [total, announcements] = await this.prisma.$transaction([
      this.prisma.announcement.count(),
      this.prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    return {
      data: announcements.map((a) => ({
        id: a.id,
        kind: 'announcement' as const,
        sender: toUserSummary(a.author),
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
        readAt: null,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }
}
