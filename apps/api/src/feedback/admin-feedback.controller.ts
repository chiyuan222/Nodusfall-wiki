import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { isOwner, hasPermission, PERMISSIONS } from '../common/roles';
import { AdminListFeedbackQueryDto } from './dto/admin-list-feedback-query.dto';
import { HandleFeedbackDto } from './dto/handle-feedback.dto';
import { FeedbackService } from './feedback.service';

interface AdminRequest extends Request {
  user: { sub: string; role: string; permissions: string[] };
}

@Controller('admin/feedback')
@UseGuards(JwtAuthGuard)
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  private assertView(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CONTENT)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Get()
  list(@Req() req: AdminRequest, @Query() query: AdminListFeedbackQueryDto) {
    this.assertView(req);
    return this.feedbackService.listAdmin(query.page, query.perPage, query.status);
  }

  @Patch(':feedbackId')
  async handle(
    @Req() req: AdminRequest,
    @Param('feedbackId') feedbackId: string,
    @Body() dto: HandleFeedbackDto,
  ) {
    if (!isOwner(req.user.role)) {
      throw new ForbiddenException('only owner can reply feedback');
    }
    this.assertView(req);
    return { data: await this.feedbackService.handle(feedbackId, req.user.sub, dto) };
  }
}
