import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { SendMessageContentDto } from './dto/send-message-content.dto';
import { MessagesService } from './messages.service';

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller('users/me/announcements')
@UseGuards(JwtAuthGuard)
export class MyAnnouncementsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query() query: PaginationQueryDto) {
    return this.messagesService.listAnnouncementsForUser(
      req.user.sub,
      query.page,
      query.perPage,
    );
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@Req() req: AuthRequest): Promise<void> {
    await this.messagesService.markAnnouncementsRead(req.user.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(@Req() req: AuthRequest): Promise<void> {
    await this.messagesService.clearAnnouncements(req.user.sub);
  }

  @Delete(':announcementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(
    @Req() req: AuthRequest,
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
  ): Promise<void> {
    await this.messagesService.deleteAnnouncement(req.user.sub, announcementId);
  }
}

@Controller('users/me/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query() query: PaginationQueryDto) {
    return this.messagesService.listConversations(req.user.sub, query.page, query.perPage);
  }

  @Get(':peerId')
  history(
    @Req() req: AuthRequest,
    @Param('peerId', new ParseUUIDPipe()) peerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messagesService.listConversation(
      req.user.sub,
      peerId,
      query.page,
      query.perPage,
    );
  }

  @Post(':peerId')
  @HttpCode(HttpStatus.CREATED)
  async send(
    @Req() req: AuthRequest,
    @Param('peerId', new ParseUUIDPipe()) peerId: string,
    @Body() dto: SendMessageContentDto,
  ) {
    return { data: await this.messagesService.sendToPeer(req.user.sub, peerId, dto.content) };
  }

  @Post(':peerId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Req() req: AuthRequest,
    @Param('peerId', new ParseUUIDPipe()) peerId: string,
  ): Promise<void> {
    await this.messagesService.markConversationRead(req.user.sub, peerId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(@Req() req: AuthRequest): Promise<void> {
    await this.messagesService.clearConversations(req.user.sub);
  }

  @Delete(':peerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(
    @Req() req: AuthRequest,
    @Param('peerId', new ParseUUIDPipe()) peerId: string,
  ): Promise<void> {
    await this.messagesService.deleteConversation(req.user.sub, peerId);
  }
}
