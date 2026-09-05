import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasBoardPermission } from '../common/roles';
import { CreateVideoShareDto, UpdateVideoShareDto } from './dto/share-video.dto';
import { VideosService } from './videos.service';

interface AuthRequest extends Request {
  user: {
    sub: string;
    role: string;
    permissions: string[];
    videoShareGranted: boolean;
  };
}

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class MyVideosController {
  constructor(private readonly videosService: VideosService) {}

  private assertCanShare(req: AuthRequest): void {
    if (
      !req.user.videoShareGranted &&
      !hasBoardPermission(req.user.role, req.user.permissions, 'video')
    ) {
      throw new ForbiddenException('video share not granted');
    }
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateVideoShareDto) {
    this.assertCanShare(req);
    return {
      data: await this.videosService.create({
        ...dto,
        published: true,
        sortOrder: 0,
        authorId: req.user.sub,
      }),
    };
  }

  @Patch(':videoId')
  async update(
    @Req() req: AuthRequest,
    @Param('videoId', new ParseUUIDPipe()) videoId: string,
    @Body() dto: UpdateVideoShareDto,
  ) {
    const entry = await this.videosService.findManaged(
      videoId,
      req.user.sub,
      req.user.role,
      req.user.permissions,
    );
    if (!entry) throw new NotFoundException('video not found');
    return { data: await this.videosService.update(videoId, dto) };
  }

  @Delete(':videoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthRequest,
    @Param('videoId', new ParseUUIDPipe()) videoId: string,
  ): Promise<void> {
    const entry = await this.videosService.findManaged(
      videoId,
      req.user.sub,
      req.user.role,
      req.user.permissions,
    );
    if (!entry) throw new NotFoundException('video not found');
    await this.videosService.delete(videoId);
  }
}
