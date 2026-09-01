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
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { MessagesService } from './messages.service';

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller('users/me/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    return { data: await this.messagesService.unreadCount(req.user.sub) };
  }

  @Get()
  list(@Req() req: AuthRequest, @Query() pagination: PaginationQueryDto) {
    return this.messagesService.list(
      req.user.sub,
      pagination.page,
      pagination.perPage,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @Req() req: AuthRequest,
    @Body() dto: CreateDirectMessageDto,
  ) {
    return { data: await this.messagesService.send(req.user.sub, dto) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@Req() req: AuthRequest): Promise<void> {
    await this.messagesService.markAllRead(req.user.sub);
  }
}
