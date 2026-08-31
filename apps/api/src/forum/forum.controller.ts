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
import { PaginationQueryDto } from '../common/pagination';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';
import { ForumService } from './forum.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('boards')
  listBoards() {
    return this.forumService.listBoards().then((data) => ({ data }));
  }

  @Get('boards/:boardSlug/threads')
  listThreads(
    @Param('boardSlug') boardSlug: string,
    @Query() pagination: PaginationQueryDto,
    @Query('sort') sort: any,
  ) {
    return this.forumService.listThreads(boardSlug, pagination.page, pagination.perPage, sort ?? 'lastPostAt');
  }

  @UseGuards(JwtAuthGuard)
  @Post('boards/:boardSlug/threads')
  createThread(
    @Req() req: AuthenticatedRequest,
    @Param('boardSlug') boardSlug: string,
    @Body() dto: CreateForumThreadDto,
  ) {
    return this.forumService.createThread(req.user.sub, boardSlug, dto).then((data) => ({ data }));
  }

  @Get('threads/:threadId')
  getThread(@Param('threadId') threadId: string) {
    return this.forumService.getThread(threadId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('threads/:threadId')
  updateThread(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
    @Body() dto: UpdateForumThreadDto,
  ) {
    return this.forumService.updateThread(req.user.sub, threadId, dto).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('threads/:threadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(@Param('threadId') threadId: string): Promise<void> {
    await this.forumService.deleteThread(threadId);
  }

  @Get('threads/:threadId/posts')
  listPosts(@Param('threadId') threadId: string, @Query() pagination: PaginationQueryDto) {
    return this.forumService.listPosts(threadId, pagination.page, pagination.perPage);
  }

  @UseGuards(JwtAuthGuard)
  @Post('threads/:threadId/posts')
  createPost(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forumService.createPost(req.user.sub, threadId, dto).then((data) => ({ data }));
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
    await this.forumService.deletePost(req.user.sub, postId);
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
