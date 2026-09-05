import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { FeedbackService } from './feedback.service';
import { UserFeedbackController } from './user-feedback.controller';
import { AdminFeedbackController } from './admin-feedback.controller';

@Module({
  imports: [MessagesModule],
  controllers: [UserFeedbackController, AdminFeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
