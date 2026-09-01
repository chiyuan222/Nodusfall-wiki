import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { ListForumThreadsQueryDto } from './dto/list-forum-threads-query.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';
import { ForumService } from './forum.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
    permissions: string[];
    status: string;
    group: string;
  };
}

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('boards')
  listBoards() {
    return this.forumService.listBoards().then((data) => ({ data }));
  }

  @Get('boards/:boardSlug/threads')
  @UseGuards(OptionalJwtAuthGuard)
  listThreads(
    @Req() req: Request,
    @Param('boardSlug') boardSlug: string,
    @Query() query: ListForumThreadsQueryDto,
  ) {
    const userId = (req as any).user?.sub;
    return this.forumService.listThreads(
      boardSlug,
      query.page,
      query.perPage,
      query.sort ?? 'lastPostAt',
      userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('boards/:boardSlug/threads')
  createThread(
    @Req() req: AuthenticatedRequest,
    @Param('boardSlug') boardSlug: string,
    @Body() dto: CreateForumThreadDto,
  ) {
    return this.forumService
      .createThread(req.user.sub, boardSlug, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
        group: req.user.group,
        status: req.user.status,
      })
      .then((data) => ({ data }));
  }

  @Get('threads/:threadId')
  @UseGuards(OptionalJwtAuthGuard)
  getThread(@Req() req: Request, @Param('threadId') threadId: string) {
    const userId = (req as any).user?.sub;
    return this.forumService.getThread(threadId, userId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('threads/:threadId')
  updateThread(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
    @Body() dto: UpdateForumThreadDto,
  ) {
    return this.forumService
      .updateThread(req.user.sub, threadId, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
      })
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('threads/:threadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
  ): Promise<void> {
    await this.forumService.deleteThread(req.user.sub, threadId, {
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('threads/:threadId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likeThread(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
  ): Promise<void> {
    await this.forumService.likeThread(req.user.sub, threadId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('threads/:threadId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikeThread(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
  ): Promise<void> {
    await this.forumService.unlikeThread(req.user.sub, threadId);
  }

  @Get('threads/:threadId/posts')
  @UseGuards(OptionalJwtAuthGuard)
  listPosts(
    @Req() req: Request,
    @Param('threadId') threadId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = (req as any).user?.sub;
    return this.forumService.listPosts(threadId, pagination.page, pagination.perPage, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('threads/:threadId/posts')
  createPost(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forumService
      .createPost(req.user.sub, threadId, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
        group: req.user.group,
        status: req.user.status,
      })
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('posts/:postId')
  updatePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forumService.updatePost(req.user.sub, postId, dto.content).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
  ): Promise<void> {
    await this.forumService.deletePost(req.user.sub, postId, {
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('posts/:postId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likePost(@Req() req: AuthenticatedRequest, @Param('postId') postId: string): Promise<void> {
    await this.forumService.likePost(req.user.sub, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:postId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikePost(@Req() req: AuthenticatedRequest, @Param('postId') postId: string): Promise<void> {
    await this.forumService.unlikePost(req.user.sub, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('threads/:threadId/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bookmarkThread(@Req() req: AuthenticatedRequest, @Param('threadId') threadId: string): Promise<void> {
    await this.forumService.bookmarkThread(req.user.sub, threadId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('threads/:threadId/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbookmarkThread(@Req() req: AuthenticatedRequest, @Param('threadId') threadId: string): Promise<void> {
    await this.forumService.unbookmarkThread(req.user.sub, threadId);
  }
}
