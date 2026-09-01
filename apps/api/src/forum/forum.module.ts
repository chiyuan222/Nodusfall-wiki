import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { AdminForumController } from './admin-forum.controller';

@Module({
  controllers: [ForumController, AdminForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
