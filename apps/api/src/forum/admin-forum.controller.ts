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
import { CreateForumBoardDto } from './dto/create-forum-board.dto';
import { UpdateForumBoardDto } from './dto/update-forum-board.dto';
import { ForumService } from './forum.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/forum/boards')
@UseGuards(JwtAuthGuard)
export class AdminForumController {
  constructor(private readonly forumService: ForumService) {}

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('admin only');
    }
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateForumBoardDto) {
    this.assertAdmin(req);
    return this.forumService.createBoard(dto).then((data) => ({ data }));
  }

  @Patch(':slug')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateForumBoardDto,
  ) {
    this.assertAdmin(req);
    return this.forumService.updateBoard(slug, dto).then((data) => ({ data }));
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    this.assertAdmin(req);
    await this.forumService.deleteBoard(slug);
  }
}
