import { Module } from '@nestjs/common';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import {
  MyAnnouncementsController,
  ConversationsController,
} from './me-messages-ext.controller';

@Module({
  controllers: [
    MessagesController,
    AdminAnnouncementsController,
    MyAnnouncementsController,
    ConversationsController,
  ],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
