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
      OR: [
        { recipientId: userId, recipientHiddenAt: null },
        { senderId: userId, senderHiddenAt: null },
      ],
    };
    const [directTotal, directMsgs, announcements, reads] = await Promise.all([
      this.prisma.directMessage.count({ where: dmWhere }),
      this.prisma.directMessage.findMany({
        where: dmWhere,
        orderBy: { createdAt: 'desc' },
        include: { sender: true },
      }),
      this.prisma.announcement.findMany({
        where: { hides: { none: { userId } } },
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
    const [directUnread, unreadAnnouncements] = await Promise.all([
      this.prisma.directMessage.count({
        where: { recipientId: userId, readAt: null, recipientHiddenAt: null },
      }),
      this.prisma.announcement.count({
        where: {
          hides: { none: { userId } },
          reads: { none: { userId } },
        },
      }),
    ]);
    return { unread: directUnread + unreadAnnouncements };
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
      where: { recipientId: userId, readAt: null, recipientHiddenAt: null },
      data: { readAt: new Date() },
    });
    await this.markAnnouncementsRead(userId);
  }

  async markAnnouncementsRead(userId: string): Promise<void> {
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

  async listAnnouncementsForUser(userId: string, page: number, perPage: number) {
    const [total, announcements, reads] = await Promise.all([
      this.prisma.announcement.count({
        where: { hides: { none: { userId } } },
      }),
      this.prisma.announcement.findMany({
        where: { hides: { none: { userId } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
      this.prisma.announcementRead.findMany({
        where: { userId },
        select: { announcementId: true, readAt: true },
      }),
    ]);
    const readMap = new Map(reads.map((r) => [r.announcementId, r.readAt]));
    return {
      data: announcements.map((a) => ({
        id: a.id,
        kind: 'announcement' as const,
        sender: toUserSummary(a.author),
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
        readAt: readMap.get(a.id) ?? null,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async listConversations(userId: string, page: number, perPage: number) {
    const msgs = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, senderHiddenAt: null },
          { recipientId: userId, recipientHiddenAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const group = new Map<
      string,
      { peerId: string; unread: number; last?: (typeof msgs)[number] }
    >();
    for (const m of msgs) {
      const peerId = m.senderId === userId ? m.recipientId : m.senderId;
      const e = group.get(peerId) ?? { peerId, unread: 0 };
      if (!e.last) e.last = m;
      if (m.recipientId === userId && !m.readAt) e.unread += 1;
      group.set(peerId, e);
    }
    const peers = await this.prisma.user.findMany({
      where: { id: { in: [...group.keys()] } },
    });
    const peerMap = new Map(peers.map((u) => [u.id, u]));
    const convs: {
      peer: ReturnType<typeof toUserSummary>;
      unreadCount: number;
      lastMessage: { senderId: string; content: string; createdAt: Date } | null;
      updatedAt: Date;
    }[] = [];
    for (const e of group.values()) {
      const peer = peerMap.get(e.peerId);
      if (!peer) continue;
      convs.push({
        peer: toUserSummary(peer),
        unreadCount: e.unread,
        lastMessage: e.last
          ? {
              senderId: e.last.senderId,
              content: e.last.content,
              createdAt: e.last.createdAt,
            }
          : null,
        updatedAt: e.last?.createdAt ?? new Date(0),
      });
    }
    convs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const total = convs.length;
    const start = (page - 1) * perPage;
    return {
      data: convs.slice(start, start + perPage),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async listConversation(userId: string, peerId: string, page: number, perPage: number) {
    const peer = await this.prisma.user.findUnique({ where: { id: peerId } });
    if (!peer) throw new NotFoundException('用户不存在');
    const where = {
      OR: [
        { senderId: userId, recipientId: peerId, senderHiddenAt: null },
        { senderId: peerId, recipientId: userId, recipientHiddenAt: null },
      ],
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.directMessage.count({ where }),
      this.prisma.directMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { sender: true },
      }),
    ]);
    return {
      data: items.map((m) => ({
        id: m.id,
        sender: toUserSummary(m.sender),
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async sendToPeer(senderId: string, peerId: string, content: string) {
    const r = await this.send(senderId, { recipientId: peerId, content });
    return {
      id: r.id,
      sender: r.sender,
      content: r.content,
      createdAt: r.createdAt,
      readAt: r.readAt,
    };
  }

  async markConversationRead(userId: string, peerId: string): Promise<void> {
    const peer = await this.prisma.user.findUnique({ where: { id: peerId } });
    if (!peer) throw new NotFoundException('用户不存在');
    await this.prisma.directMessage.updateMany({
      where: { recipientId: userId, senderId: peerId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async deleteConversation(userId: string, peerId: string): Promise<void> {
    const peer = await this.prisma.user.findUnique({ where: { id: peerId } });
    if (!peer) throw new NotFoundException('用户不存在');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.directMessage.updateMany({
        where: {
          senderId: userId,
          recipientId: peerId,
          senderHiddenAt: null,
        },
        data: { senderHiddenAt: now },
      }),
      this.prisma.directMessage.updateMany({
        where: {
          recipientId: userId,
          senderId: peerId,
          recipientHiddenAt: null,
        },
        data: { recipientHiddenAt: now },
      }),
    ]);
  }

  async clearConversations(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.directMessage.updateMany({
        where: { senderId: userId, senderHiddenAt: null },
        data: { senderHiddenAt: now },
      }),
      this.prisma.directMessage.updateMany({
        where: { recipientId: userId, recipientHiddenAt: null },
        data: { recipientHiddenAt: now },
      }),
    ]);
  }

  async deleteAnnouncement(userId: string, announcementId: string): Promise<void> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!announcement) throw new NotFoundException('公告不存在');
    await this.prisma.announcementHide.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      update: {},
      create: { announcementId, userId },
    });
  }

  async clearAnnouncements(userId: string): Promise<void> {
    const announcements = await this.prisma.announcement.findMany({
      select: { id: true },
    });
    if (announcements.length === 0) return;
    await this.prisma.announcementHide.createMany({
      data: announcements.map((a) => ({
        announcementId: a.id,
        userId,
      })),
      skipDuplicates: true,
    });
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
