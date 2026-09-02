import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasPermission, isManagerRole, PERMISSIONS } from '../common/roles';
import { ModerationService } from './moderation.service';

class ListModerationContentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;

  @IsOptional()
  @IsIn(['forumThread', 'forumPost', 'comment', 'wikiPage', 'guide'])
  type?: string;
}

interface AdminRequest extends Request {
  user: { role: string; permissions: string[] };
}

@Controller('admin/moderation/content')
@UseGuards(JwtAuthGuard)
export class AdminModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  list(@Req() req: AdminRequest, @Query() query: ListModerationContentQueryDto) {
    if (
      !isManagerRole(req.user.role) ||
      !hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CONTENT)
    ) {
      throw new ForbiddenException('moderator only');
    }
    return this.moderationService.listContent(query);
  }
}
