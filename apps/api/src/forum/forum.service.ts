import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ForumBoard, ForumPost, ForumThread, User } from '@prisma/client';
import { pageInfo } from '../common/pagination';
import { extractFirstImage } from '../common/markdown';
import { hasPermission, PERMISSIONS } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary } from '../users/users.service';

type BoardWithCount = ForumBoard & { _count: { threads: number } };
type ThreadWithAuthor = ForumThread & { author: User };
type PostWithAuthor = ForumPost & { author: User };

function boardView(board: BoardWithCount) {
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    description: board.description,
    sortOrder: board.sortOrder,
    threadCount: board._count.threads,
  };
}

function threadSummary(
  thread: ThreadWithAuthor,
  likedByMe = false,
  bookmarkedByMe = false,
) {
  return {
    id: thread.id,
    boardSlug: '', // patched by caller
    title: thread.title,
    excerpt: plainExcerpt(thread.content),
    coverImage: thread.coverImage ?? extractFirstImage(thread.content),
    author: toUserSummary(thread.author),
    pinned: thread.pinned,
    locked: thread.locked,
    replyCount: thread.replyCount,
    likeCount: thread.likeCount,
    likedByMe,
    bookmarkedByMe,
    viewCount: thread.viewCount,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastPostAt: thread.lastPostAt,
  };
}

function postView(post: PostWithAuthor, likedByMe = false) {
  return {
    id: post.id,
    threadId: post.threadId,
    author: toUserSummary(post.author),
    content: post.content,
    floor: post.floor,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    likeCount: post.likeCount,
    likedByMe,
  };
}

function plainExcerpt(content: string): string {
  return content
    .replace(/[#>*_`~\-[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  listBoards() {
    return this.prisma.forumBoard
      .findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { threads: true } } },
      })
      .then((boards) => boards.map(boardView));
  }

  async createBoard(dto: {
    slug: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }) {
    const existing = await this.prisma.forumBoard.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('board slug already exists');
    }
    return this.prisma.forumBoard.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateBoard(slug: string, dto: {
    name?: string;
    description?: string;
    sortOrder?: number;
  }) {
    const board = await this.prisma.forumBoard.findUnique({ where: { slug } });
    if (!board) {
      throw new NotFoundException('board not found');
    }
    return this.prisma.forumBoard.update({
      where: { id: board.id },
      data: {
        name: dto.name ?? board.name,
        description: dto.description ?? board.description,
        sortOrder: dto.sortOrder ?? board.sortOrder,
      },
    });
  }

  async deleteBoard(slug: string): Promise<void> {
    const board = await this.prisma.forumBoard.findUnique({ where: { slug } });
    if (!board) {
      throw new NotFoundException('board not found');
    }
    const count = await this.prisma.forumThread.count({
      where: { boardId: board.id },
    });
    if (count > 0) {
      throw new ConflictException('board is not empty');
    }
    await this.prisma.forumBoard.delete({ where: { id: board.id } });
  }

  async listThreads(
    boardSlug: string,
    page: number,
    perPage: number,
    sort: 'lastPostAt' | 'createdAt',
    userId?: string,
  ) {
    const board = await this.prisma.forumBoard.findUnique({ where: { slug: boardSlug } });
    if (!board) throw new NotFoundException('board not found');
    const where = { boardId: board.id };
    const orderBy = sort === 'createdAt' ? { createdAt: 'desc' as const } : { lastPostAt: 'desc' as const };
    const [total, threads] = await this.prisma.$transaction([
      this.prisma.forumThread.count({ where }),
      this.prisma.forumThread.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    const bookmarks = userId
      ? new Set(
          (
            await this.prisma.forumThreadBookmark.findMany({
              where: { userId, threadId: { in: threads.map((t) => t.id) } },
            })
          ).map((b) => b.threadId),
        )
      : new Set<string>();
    const likes = userId
      ? new Set(
          (
            await this.prisma.forumThreadLike.findMany({
              where: { userId, threadId: { in: threads.map((t) => t.id) } },
            })
          ).map((l) => l.threadId),
        )
      : new Set<string>();
    return {
      data: threads.map((thread) => ({
        ...threadSummary(thread, likes.has(thread.id), bookmarks.has(thread.id)),
        boardSlug,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async createThread(
    userId: string,
    boardSlug: string,
    dto: { title: string; content: string; coverImage?: string | null },
    auth?: { role: string; permissions: string[]; group: string; status: string },
  ) {
    if (auth?.status === 'MUTED' || auth?.status === 'BANNED') {
      throw new ForbiddenException('account restricted');
    }
    if (auth?.group !== 'VERIFIED' && !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_FORUM)) {
      throw new ForbiddenException('verified account required');
    }
    const board = await this.prisma.forumBoard.findUnique({ where: { slug: boardSlug } });
    if (!board) throw new NotFoundException('board not found');
    const thread = await this.prisma.forumThread.create({
      data: {
        boardId: board.id,
        title: dto.title,
        content: dto.content,
        coverImage: dto.coverImage ?? null,
        authorId: userId,
      },
      include: { author: true },
    });
    return { ...threadSummary(thread), boardSlug, content: thread.content };
  }

  async getThread(threadId: string, userId?: string) {
    await this.prisma.forumThread.updateMany({
      where: { id: threadId },
      data: { viewCount: { increment: 1 } },
    });
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { author: true, board: true },
    });
    if (!thread) throw new NotFoundException('thread not found');
    const bookmarked = userId
      ? !!(await this.prisma.forumThreadBookmark.findUnique({
          where: { threadId_userId: { threadId, userId } },
        }))
      : false;
    const liked = userId
      ? !!(await this.prisma.forumThreadLike.findUnique({
          where: { threadId_userId: { threadId, userId } },
        }))
      : false;
    return {
      ...threadSummary(thread, liked, bookmarked),
      boardSlug: thread.board.slug,
      content: thread.content,
      featuredAt: thread.featuredAt,
    };
  }

  async updateThread(
    userId: string,
    threadId: string,
    dto: {
    title?: string;
    pinned?: boolean;
    locked?: boolean;
    coverImage?: string | null;
    featured?: boolean;
    featuredAt?: string | null;
    },
    auth?: { role: string; permissions: string[] },
  ) {
    const existing = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!existing) throw new NotFoundException('thread not found');
    const isManager = hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_FORUM);
    const isModerator = hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_CONTENT);
    if (existing.authorId !== userId && !isManager && !isModerator) {
      throw new ForbiddenException('not your thread');
    }
    if ((dto.pinned !== undefined || dto.locked !== undefined) && !isManager) {
      throw new ForbiddenException('admin only');
    }
    const thread = await this.prisma.forumThread.update({
      where: { id: threadId },
      data: {
        title: dto.title ?? existing.title,
        pinned: dto.pinned ?? existing.pinned,
        locked: dto.locked ?? existing.locked,
        coverImage: dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
        featuredAt: dto.featuredAt
          ? new Date(dto.featuredAt)
          : dto.featured === true
            ? new Date()
            : dto.featured === false
              ? null
              : existing.featuredAt,
      },
      include: { author: true, board: true },
    });
    return {
      ...threadSummary(thread),
      boardSlug: thread.board.slug,
      content: thread.content,
      featuredAt: thread.featuredAt,
    };
  }

  async deleteThread(
    userId: string,
    threadId: string,
    auth?: { role: string; permissions: string[] },
  ): Promise<void> {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('thread not found');
    if (
      thread.authorId !== userId &&
      !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_DELETION)
    ) {
      throw new ForbiddenException('not your thread');
    }
    await this.prisma.$transaction([
      this.prisma.forumPostLike.deleteMany({
        where: { post: { threadId } },
      }),
      this.prisma.forumPost.deleteMany({ where: { threadId } }),
      this.prisma.forumThreadBookmark.deleteMany({ where: { threadId } }),
      this.prisma.forumThread.delete({ where: { id: threadId } }),
    ]);
  }

  async likeThread(userId: string, threadId: string): Promise<void> {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('thread not found');
    const existing = await this.prisma.forumThreadLike.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!existing) {
      await this.prisma.forumThreadLike.create({
        data: { threadId, userId },
      });
      await this.prisma.forumThread.update({
        where: { id: threadId },
        data: { likeCount: { increment: 1 } },
      });
    }
  }

  async unlikeThread(userId: string, threadId: string): Promise<void> {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('thread not found');
    const result = await this.prisma.forumThreadLike.deleteMany({
      where: { threadId, userId },
    });
    if (result.count > 0) {
      await this.prisma.forumThread.update({
        where: { id: threadId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  async listPosts(threadId: string, page: number, perPage: number, userId?: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('thread not found');
    const where = { threadId };
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.forumPost.count({ where }),
      this.prisma.forumPost.findMany({
        where,
        orderBy: { floor: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true },
      }),
    ]);
    const liked = userId
      ? new Set(
          (
            await this.prisma.forumPostLike.findMany({
              where: { userId, postId: { in: posts.map((p) => p.id) } },
            })
          ).map((like) => like.postId),
        )
      : new Set<string>();
    return {
      data: posts.map((post) => postView(post, liked.has(post.id))),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async createPost(
    userId: string,
    threadId: string,
    dto: { content: string },
    auth?: { role: string; permissions: string[]; group: string; status: string },
  ) {
    if (auth?.status === 'MUTED' || auth?.status === 'BANNED') {
      throw new ForbiddenException('account restricted');
    }
    if (auth?.group !== 'VERIFIED' && !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_FORUM)) {
      throw new ForbiddenException('verified account required');
    }
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('thread not found');
    if (thread.locked) throw new ForbiddenException('thread is locked');
    const floor = thread.replyCount + 1;
    const [post] = await this.prisma.$transaction([
      this.prisma.forumPost.create({
        data: { threadId, authorId: userId, content: dto.content, floor },
        include: { author: true },
      }),
      this.prisma.forumThread.update({
        where: { id: threadId },
        data: { replyCount: floor, lastPostAt: new Date() },
      }),
    ]);
    return postView(post);
  }

  async updatePost(userId: string, postId: string, content: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('post not found');
    if (post.authorId !== userId) throw new ForbiddenException('not your post');
    const updated = await this.prisma.forumPost.update({
      where: { id: postId },
      data: { content },
      include: { author: true },
    });
    return postView(updated);
  }

  async deletePost(
    userId: string,
    postId: string,
    auth?: { role: string; permissions: string[] },
  ): Promise<void> {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('post not found');
    if (
      post.authorId !== userId &&
      !hasPermission(auth?.role, auth?.permissions, PERMISSIONS.MANAGE_DELETION)
    ) {
      throw new ForbiddenException('not your post');
    }
    await this.prisma.forumPost.delete({ where: { id: postId } });
  }

  async likePost(userId: string, postId: string): Promise<void> {
    const existing = await this.prisma.forumPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      await this.prisma.forumPostLike.create({ data: { postId, userId } });
      await this.prisma.forumPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
    }
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const result = await this.prisma.forumPostLike.deleteMany({
      where: { postId, userId },
    });
    if (result.count > 0) {
      await this.prisma.forumPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  async bookmarkThread(userId: string, threadId: string): Promise<void> {
    await this.prisma.forumThreadBookmark.upsert({
      where: { threadId_userId: { threadId, userId } },
      update: {},
      create: { threadId, userId },
    });
  }

  async unbookmarkThread(userId: string, threadId: string): Promise<void> {
    await this.prisma.forumThreadBookmark.deleteMany({
      where: { threadId, userId },
    });
  }

  async myThreads(userId: string, page: number, perPage: number) {
    const where = { authorId: userId };
    const [total, threads] = await this.prisma.$transaction([
      this.prisma.forumThread.count({ where }),
      this.prisma.forumThread.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { author: true, board: true },
      }),
    ]);
    return {
      data: threads.map((thread) => ({
        ...threadSummary(thread),
        boardSlug: thread.board.slug,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async myBookmarks(userId: string, page: number, perPage: number) {
    const where = { userId };
    const [total, bookmarks] = await this.prisma.$transaction([
      this.prisma.forumThreadBookmark.count({ where }),
      this.prisma.forumThreadBookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          thread: { include: { author: true, board: true } },
        },
      }),
    ]);
    return {
      data: bookmarks.map((bookmark) => ({
        ...threadSummary(bookmark.thread),
        boardSlug: bookmark.thread.board.slug,
        bookmarkedByMe: true,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }
}
