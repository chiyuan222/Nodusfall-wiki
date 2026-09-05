import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Comment, User } from '@prisma/client';
import { pageInfo } from '../common/pagination';
import { hasBoardPermission, isStaffRole } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';
import { ExpService } from '../exp/exp.service';
import { TextFilterService } from '../moderation/text-filter.service';

type CommentWithAuthor = Comment & { author: User };

function commentView(comment: CommentWithAuthor, likedByMe = false, replyCount = 0) {
  return {
    id: comment.id,
    targetType: comment.targetType === 'WIKI_PAGE' ? 'wiki_page' : 'guide',
    targetId: comment.targetId,
    parentId: comment.parentId,
    author: toUserSummary(comment.author),
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    likeCount: comment.likeCount,
    likedByMe,
    replyCount,
  };
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expService: ExpService,
    private readonly textFilter: TextFilterService,
  ) {}

  private async resolveTarget(type: 'WIKI_PAGE' | 'GUIDE', slug: string): Promise<string> {
    if (type === 'WIKI_PAGE') {
      const page = await this.prisma.wikiPage.findUnique({ where: { slug } });
      if (!page) throw new NotFoundException('page not found');
      return page.id;
    }
    const guide = await this.prisma.guide.findUnique({ where: { slug } });
    if (!guide) throw new NotFoundException('guide not found');
    return guide.id;
  }

  private assertCanComment(auth?: {
    role: string;
    permissions: string[];
    group: string;
    status: string;
  }): void {
    if (auth?.status === 'MUTED' || auth?.status === 'BANNED') {
      throw new ForbiddenException('account restricted');
    }
    if (
      auth?.group !== 'VERIFIED' &&
      !isStaffRole(auth?.role)
    ) {
      throw new ForbiddenException('verified account required');
    }
  }

  async list(
    type: 'WIKI_PAGE' | 'GUIDE',
    slug: string,
    page: number,
    perPage: number,
    userId?: string,
  ) {
    const targetId = await this.resolveTarget(type, slug);
    const where = { targetType: type, targetId, parentId: null };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    const topIds = comments.map((c) => c.id);
    const grouped =
      topIds.length > 0
        ? await this.prisma.comment.groupBy({
            by: ['parentId'],
            where: { parentId: { in: topIds } },
            _count: { _all: true },
          })
        : [];
    const replyCountMap = new Map(
      grouped.map((g) => [g.parentId as string, g._count._all]),
    );
    const liked = userId
      ? new Set(
          (
            await this.prisma.commentLike.findMany({
              where: { userId, commentId: { in: comments.map((c) => c.id) } },
            })
          ).map((like) => like.commentId),
        )
      : new Set<string>();
    return {
      data: comments.map((comment) =>
        commentView(comment, liked.has(comment.id), replyCountMap.get(comment.id) ?? 0),
      ),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async create(
    userId: string,
    type: 'WIKI_PAGE' | 'GUIDE',
    slug: string,
    content: string,
    auth?: { role: string; permissions: string[]; group: string; status: string },
  ) {
    this.assertCanComment(auth);
    await this.textFilter.assertSafe(content);
    const targetId = await this.resolveTarget(type, slug);
    const comment = await this.prisma.comment.create({
      data: { targetType: type, targetId, authorId: userId, content },
      include: { author: true },
    });
    void this.expService.grant(userId, "comment", comment.id);
    return commentView(comment);
  }

  async listReplies(
    commentId: string,
    page: number,
    perPage: number,
    userId?: string,
  ) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!parent) throw new NotFoundException('comment not found');
    if (parent.parentId !== null) {
      throw new BadRequestException('仅顶层评论可展开回复');
    }
    const where = { parentId: commentId };
    const [total, replies] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    const liked = userId
      ? new Set(
          (
            await this.prisma.commentLike.findMany({
              where: { userId, commentId: { in: replies.map((c) => c.id) } },
            })
          ).map((like) => like.commentId),
        )
      : new Set<string>();
    return {
      data: replies.map((reply) => commentView(reply, liked.has(reply.id), 0)),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async createReply(
    userId: string,
    commentId: string,
    content: string,
    auth?: { role: string; permissions: string[]; group: string; status: string },
  ) {
    this.assertCanComment(auth);
    await this.textFilter.assertSafe(content);
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!parent) throw new NotFoundException('comment not found');
    if (parent.parentId !== null) {
      throw new BadRequestException('回复仅允许针对顶层评论');
    }
    const reply = await this.prisma.comment.create({
      data: {
        targetType: parent.targetType,
        targetId: parent.targetId,
        parentId: parent.id,
        authorId: userId,
        content,
      },
      include: { author: true },
    });
    void this.expService.grant(userId, 'comment', reply.id);
    return commentView(reply);
  }

  async update(userId: string, commentId: string, content: string) {
    await this.textFilter.assertSafe(content);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('not your comment');
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: true },
    });
    return commentView(updated);
  }

  async delete(
    userId: string,
    commentId: string,
    auth?: { role: string; permissions: string[] },
  ): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('comment not found');
    if (comment.authorId !== userId) {
      const board = comment.targetType === 'WIKI_PAGE' ? 'wiki' : 'guide';
      if (!hasBoardPermission(auth?.role, auth?.permissions, board)) {
        throw new ForbiddenException('not your comment');
      }
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  async like(userId: string, commentId: string): Promise<void> {
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) {
      await this.prisma.commentLike.create({ data: { commentId, userId } });
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      });
      void this.expService.grant(userId, "like", commentId);
    }
  }

  async unlike(userId: string, commentId: string): Promise<void> {
    const result = await this.prisma.commentLike.deleteMany({
      where: { commentId, userId },
    });
    if (result.count > 0) {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }
}
