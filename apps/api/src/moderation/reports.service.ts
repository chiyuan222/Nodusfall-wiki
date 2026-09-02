import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Report, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageInfo } from '../common/pagination';
import { toUserSummary } from '../users/users.service';

export interface CreateReportInput {
  targetType: string;
  targetId: string;
  reason: string;
  detail?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, input: CreateReportInput) {
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
    return this.toDto(report, null, null);
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

    const userIds = [
      ...new Set(items.flatMap((i) => [i.reporterId, i.handledById ?? '']).filter(Boolean)),
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
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('举报不存在');
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
    return this.toDto(updated, reporter, handler);
  }

  private toDto(
    report: Report,
    reporter: User | null,
    handler: User | null,
  ) {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
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
