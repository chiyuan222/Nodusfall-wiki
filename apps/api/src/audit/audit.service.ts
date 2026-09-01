import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageInfo } from '../common/pagination';
import { toUserSummary } from '../users/users.service';

export interface AuditLogQuery {
  page: number;
  perPage: number;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    detail?: string,
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorName: actor?.username ?? 'unknown',
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        detail: detail ?? null,
      },
    });
  }

  async list(query: AuditLogQuery) {
    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.actorId) where.actorId = query.actorId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);

    const actorIds = [...new Set(items.map((i) => i.actorId))];
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
    });
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return {
      data: items.map((item) => ({
        id: item.id,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        detail: item.detail,
        actorName: item.actorName,
        actor: actorMap.has(item.actorId)
          ? toUserSummary(actorMap.get(item.actorId)!)
          : null,
        createdAt: item.createdAt,
      })),
      pagination: pageInfo(query.page, query.perPage, total),
    };
  }
}
