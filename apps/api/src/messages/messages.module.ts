import { Module } from '@nestjs/common';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  controllers: [MessagesController, AdminAnnouncementsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
