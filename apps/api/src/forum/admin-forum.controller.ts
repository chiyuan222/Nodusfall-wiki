import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { isManagerRole } from '../common/roles';
import { CreateForumBoardDto } from './dto/create-forum-board.dto';
import { UpdateForumBoardDto } from './dto/update-forum-board.dto';
import { ForumService } from './forum.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/forum/boards')
@UseGuards(JwtAuthGuard)
export class AdminForumController {
  constructor(
    private readonly forumService: ForumService,
    private readonly auditService: AuditService,
  ) {}

  private assertAdmin(req: AuthenticatedRequest): void {
    if (!isManagerRole(req.user.role)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateForumBoardDto) {
    this.assertAdmin(req);
    const data = await this.forumService.createBoard(dto);
    await this.auditService.log(
      req.user.sub,
      'forum.board.create',
      'forumBoard',
      data.slug,
      `新建论坛板块「${data.name}」`,
    );
    return { data };
  }

  @Patch(':slug')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateForumBoardDto,
  ) {
    this.assertAdmin(req);
    const data = await this.forumService.updateBoard(slug, dto);
    await this.auditService.log(
      req.user.sub,
      'forum.board.update',
      'forumBoard',
      slug,
      `修改论坛板块「${data.name}」`,
    );
    return { data };
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    this.assertAdmin(req);
    await this.forumService.deleteBoard(slug);
    await this.auditService.log(
      req.user.sub,
      'forum.board.delete',
      'forumBoard',
      slug,
      `删除论坛板块「${slug}」`,
    );
  }
}
