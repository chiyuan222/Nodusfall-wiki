import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { hasPermission, PERMISSIONS } from '../common/roles';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';

interface AdminRequest extends Request {
  user: { sub: string; role: string; permissions: string[] };
}

class AdminListVideosQueryDto {
  @IsOptional()
  @IsIn(['official', 'analysis', 'gameplay'])
  kind?: 'official' | 'analysis' | 'gameplay';

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
}

@Controller('admin/videos')
@UseGuards(JwtAuthGuard)
export class AdminVideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly auditService: AuditService,
  ) {}

  private assert(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CONTENT)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Get()
  list(@Req() req: AdminRequest, @Query() query: AdminListVideosQueryDto) {
    this.assert(req);
    return this.videosService.listAdmin(query.kind, query.page, query.perPage);
  }

  @Post()
  async create(@Req() req: AdminRequest, @Body() dto: CreateVideoDto) {
    this.assert(req);
    const data = await this.videosService.create(dto);
    await this.auditService.log(
      req.user.sub,
      'video.create',
      'video',
      data.id,
      `新建相关视频「${dto.title ?? ''}」`,
    );
    return { data };
  }

  @Patch(':videoId')
  async update(
    @Req() req: AdminRequest,
    @Param('videoId') videoId: string,
    @Body() dto: UpdateVideoDto,
  ) {
    this.assert(req);
    const data = await this.videosService.update(videoId, dto);
    await this.auditService.log(
      req.user.sub,
      'video.update',
      'video',
      videoId,
      `修改相关视频（${videoId}）`,
    );
    return { data };
  }

  @Delete(':videoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AdminRequest,
    @Param('videoId') videoId: string,
  ): Promise<void> {
    this.assert(req);
    await this.videosService.delete(videoId);
    await this.auditService.log(
      req.user.sub,
      'video.delete',
      'video',
      videoId,
      `删除相关视频（${videoId}）`,
    );
  }
}
