import {
  Body,
  Controller,
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
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class UserFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthRequest, @Body() dto: CreateFeedbackDto) {
    return { data: await this.feedbackService.create(req.user.sub, dto) };
  }

  @Get('users/me/feedback')
  list(@Req() req: AuthRequest, @Query() query: PaginationQueryDto) {
    return this.feedbackService.listMine(req.user.sub, query.page, query.perPage);
  }
}
