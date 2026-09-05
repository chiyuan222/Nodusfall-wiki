import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Feedback, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageInfo } from '../common/pagination';
import { toUserSummary } from '../users/users.service';
import { TextFilterService } from '../moderation/text-filter.service';
import { MessagesService } from '../messages/messages.service';

const DAILY_LIMIT = 10;

const CATEGORY_LABEL: Record<string, string> = {
  bug: '问题反馈',
  suggestion: '功能建议',
  appeal: '内容申诉',
  other: '其他',
};

interface FeedbackDetail extends Feedback {
  user: User;
  repliedBy?: User | null;
}

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textFilter: TextFilterService,
    private readonly messages: MessagesService,
  ) {}

  async create(userId: string, dto: { category: string; content: string }) {
    await this.textFilter.assertSafe(dto.content);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.feedback.count({
      where: { userId, createdAt: { gte: dayStart } },
    });
    if (todayCount >= DAILY_LIMIT) {
      throw new HttpException(
        {
          detail: '今日反馈次数已用完，请明天再试',
          code: 'RATE_LIMITED',
          retryAfter: 3600,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const fb = await this.prisma.feedback.create({
      data: {
        userId,
        category: dto.category.toUpperCase() as never,
        content: dto.content,
      },
      include: { user: true },
    });
    return this.toDto(fb);
  }

  async listMine(userId: string, page: number, perPage: number) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: true, repliedBy: true },
      }),
    ]);
    return {
      data: items.map((i) => this.toDto(i)),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async listAdmin(
    page: number,
    perPage: number,
    status?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: true, repliedBy: true },
      }),
    ]);
    return {
      data: items.map((i) => this.toDto(i)),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async handle(
    feedbackId: string,
    handlerId: string,
    dto: { status: 'REPLIED' | 'CLOSED'; replyText?: string },
  ) {
    const fb = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true },
    });
    if (!fb) throw new NotFoundException('反馈不存在');
    if (dto.status === 'REPLIED' && !dto.replyText?.trim()) {
      throw new BadRequestException('回复状态必须填写回复内容');
    }
    if (dto.replyText) {
      await this.textFilter.assertSafe(dto.replyText);
    }
    const updated = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status as never,
        replyText:
          dto.status === 'REPLIED' ? (dto.replyText ?? null) : (dto.replyText ?? fb.replyText),
        repliedById: handlerId,
        repliedAt: new Date(),
      },
      include: { user: true, repliedBy: true },
    });
    if (dto.status === 'REPLIED' && dto.replyText) {
      try {
        await this.messages.notifyUserChange(
          handlerId,
          fb.userId,
          `【反馈回复】你提交的「${
            CATEGORY_LABEL[fb.category.toLowerCase()] ?? fb.category
          }」已收到站长回复：\n${dto.replyText}`,
        );
      } catch (e) {
        console.error('feedback reply notify failed', e);
      }
    }
    return this.toDto(updated);
  }

  private toDto(fb: FeedbackDetail) {
    return {
      id: fb.id,
      category: fb.category.toLowerCase(),
      content: fb.content,
      status: fb.status,
      replyText: fb.replyText,
      author: toUserSummary(fb.user),
      createdAt: fb.createdAt,
      repliedAt: fb.repliedAt,
      handledBy: fb.repliedBy ? toUserSummary(fb.repliedBy) : null,
    };
  }
}
