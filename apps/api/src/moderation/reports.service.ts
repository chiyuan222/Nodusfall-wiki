import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Report, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageInfo } from '../common/pagination';
import { canDiscipline, hasPermission, PERMISSIONS } from '../common/roles';
import { toUserSummary } from '../users/users.service';
import { MessagesService } from '../messages/messages.service';
import { AuditService } from '../audit/audit.service';

export interface CreateReportInput {
  targetType: string;
  targetId: string;
  reason: string;
  detail?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly audit: AuditService,
  ) {}

  async create(reporterId: string, input: CreateReportInput) {
    let targetUser: User | null = null;
    if (input.targetType === 'user') {
      targetUser = await this.prisma.user.findUnique({
        where: { id: input.targetId },
      });
      if (!targetUser) {
        throw new NotFoundException('被举报用户不存在');
      }
    }
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new ConflictException('该内容已有待处理的举报');
    }
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        detail: input.detail ?? null,
      },
    });
    return this.toDto(report, null, null, targetUser);
  }

  async list(query: {
    page: number;
    perPage: number;
    status?: string;
    targetType?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.targetType) where.targetType = query.targetType;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);

    const targetUserIds = items
      .filter((i) => i.targetType === 'user')
      .map((i) => i.targetId);
    const userIds = [
      ...new Set(
        items
          .flatMap((i) => [i.reporterId, i.handledById ?? ''])
          .concat(targetUserIds)
          .filter(Boolean),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: items.map((r) =>
        this.toDto(
          r,
          userMap.get(r.reporterId) ?? null,
          r.handledById ? (userMap.get(r.handledById) ?? null) : null,
          r.targetType === 'user' ? (userMap.get(r.targetId) ?? null) : null,
        ),
      ),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }

  async handle(
    reportId: string,
    handlerId: string,
    status: 'RESOLVED' | 'REJECTED',
    note?: string,
    discipline?: { action: 'mute' | 'ban'; reason?: string; durationDays?: number },
    actor?: { role: string; permissions: string[] },
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('举报不存在');
    }
    if (discipline) {
      if (status !== 'RESOLVED') {
        throw new BadRequestException('仅已处理(RESOLVED)的举报可附带账号处置');
      }
      const target = await this.resolveDisciplineUser(report);
      if (!target) throw new NotFoundException('被举报账号不存在');
      if (
        !hasPermission(actor?.role, actor?.permissions, PERMISSIONS.MANAGE_USERS) ||
        !canDiscipline(actor?.role, target.role)
      ) {
        throw new ForbiddenException('无处置权限（需用户管理且只能处置低于自己的账号）');
      }
      await this.applyDiscipline(target, discipline, handlerId);
    }
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        note: note ?? null,
        handledById: handlerId,
        handledAt: new Date(),
      },
    });
    const handler = await this.prisma.user.findUnique({
      where: { id: handlerId },
    });
    const reporter = await this.prisma.user.findUnique({
      where: { id: updated.reporterId },
    });
    const targetUser =
      updated.targetType === 'user'
        ? await this.prisma.user.findUnique({ where: { id: updated.targetId } })
        : null;
    return this.toDto(updated, reporter, handler, targetUser);
  }

  private async resolveDisciplineUser(report: Report): Promise<User | null> {
    switch (report.targetType) {
      case 'user':
        return this.prisma.user.findUnique({ where: { id: report.targetId } });
      case 'wikiPage': {
        const page = await this.prisma.wikiPage.findUnique({
          where: { slug: report.targetId },
          select: { authorId: true },
        });
        return page
          ? this.prisma.user.findUnique({ where: { id: page.authorId } })
          : null;
      }
      case 'guide': {
        const guide = await this.prisma.guide.findUnique({
          where: { slug: report.targetId },
          select: { authorId: true },
        });
        return guide
          ? this.prisma.user.findUnique({ where: { id: guide.authorId } })
          : null;
      }
      case 'forumThread':
      case 'forumPost':
      case 'comment': {
        const model =
          report.targetType === 'forumThread'
            ? this.prisma.forumThread
            : report.targetType === 'forumPost'
              ? this.prisma.forumPost
              : this.prisma.comment;
        const row = await (model as any).findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        return row
          ? this.prisma.user.findUnique({ where: { id: row.authorId } })
          : null;
      }
      default:
        return null;
    }
  }

  private async applyDiscipline(
    target: User,
    discipline: { action: 'mute' | 'ban'; reason?: string; durationDays?: number },
    handlerId: string,
  ): Promise<void> {
    const now = new Date();
    const defaultDays = discipline.action === 'mute' ? 7 : 0;
    const days = discipline.durationDays ?? defaultDays;
    const until = days > 0 ? new Date(now.getTime() + days * 86400000) : null;
    if (discipline.action === 'mute') {
      await this.prisma.user.update({
        where: { id: target.id },
        data: {
          status: 'MUTED',
          mutedUntil: until,
          banReason: null,
          banUntil: null,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: target.id },
        data: {
          status: 'BANNED',
          banReason: discipline.reason ?? null,
          banUntil: until,
          mutedUntil: null,
        },
      });
      await this.prisma.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    const label = discipline.action === 'mute' ? '禁言' : '封禁';
    const when = until ? `，至 ${until.toISOString()}` : '（永久）';
    try {
      await this.messages.notifyUserChange(
        handlerId,
        target.id,
        `【账号状态通知】你的账号已被${label}${discipline.reason ? `，原因：${discipline.reason}` : ''}${when}。如有疑问请联系站长。`,
      );
    } catch (e) {
      console.error('discipline notify failed', e);
    }
    await this.audit.log(
      handlerId,
      'user.update',
      'user',
      target.id,
      `举报处理附带${label}${discipline.reason ? `：${discipline.reason}` : ''}`,
    );
  }

  private toDto(
    report: Report,
    reporter: User | null,
    handler: User | null,
    targetUser: User | null,
  ) {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      targetUser: targetUser ? toUserSummary(targetUser) : null,
      reason: report.reason,
      detail: report.detail,
      status: report.status,
      note: report.note,
      reporter: reporter ? toUserSummary(reporter) : null,
      handledBy: handler ? toUserSummary(handler) : null,
      handledAt: report.handledAt,
      createdAt: report.createdAt,
    };
  }
}
