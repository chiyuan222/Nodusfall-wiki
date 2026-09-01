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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
    permissions: string[];
    group: string;
    status: string;
  };
}

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('wiki/pages/:slug/comments')
  @UseGuards(OptionalJwtAuthGuard)
  listWikiComments(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = (req as any).user?.sub;
    return this.commentsService.list('WIKI_PAGE', slug, pagination.page, pagination.perPage, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wiki/pages/:slug/comments')
  createWikiComment(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService
      .create(req.user.sub, 'WIKI_PAGE', slug, dto.content, {
        role: req.user.role,
        permissions: req.user.permissions,
        group: req.user.group,
        status: req.user.status,
      })
      .then((data) => ({ data }));
  }

  @Get('guides/:slug/comments')
  @UseGuards(OptionalJwtAuthGuard)
  listGuideComments(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = (req as any).user?.sub;
    return this.commentsService.list('GUIDE', slug, pagination.page, pagination.perPage, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('guides/:slug/comments')
  createGuideComment(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService
      .create(req.user.sub, 'GUIDE', slug, dto.content, {
        role: req.user.role,
        permissions: req.user.permissions,
        group: req.user.group,
        status: req.user.status,
      })
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('comments/:commentId')
  updateComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService
      .update(req.user.sub, commentId, dto.content)
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.commentsService.delete(req.user.sub, commentId, {
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('comments/:commentId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likeComment(@Req() req: AuthenticatedRequest, @Param('commentId') commentId: string): Promise<void> {
    await this.commentsService.like(req.user.sub, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikeComment(@Req() req: AuthenticatedRequest, @Param('commentId') commentId: string): Promise<void> {
    await this.commentsService.unlike(req.user.sub, commentId);
  }
}
