import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { isOwner } from '../common/roles';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { MessagesService } from './messages.service';

interface AdminRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/announcements')
@UseGuards(JwtAuthGuard)
export class AdminAnnouncementsController {
  constructor(private readonly messagesService: MessagesService) {}

  private assertOwner(req: AdminRequest): void {
    if (!isOwner(req.user.role)) {
      throw new ForbiddenException('owner only');
    }
  }

  @Get()
  list(@Req() req: AdminRequest, @Query() pagination: PaginationQueryDto) {
    this.assertOwner(req);
    return this.messagesService.listAnnouncements(
      pagination.page,
      pagination.perPage,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AdminRequest,
    @Body() dto: CreateAnnouncementDto,
  ) {
    this.assertOwner(req);
    return {
      data: await this.messagesService.createAnnouncement(req.user.sub, dto),
    };
  }
}
