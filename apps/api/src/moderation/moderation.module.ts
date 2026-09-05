import { Global, Module } from '@nestjs/common';
import { TextFilterService } from './text-filter.service';
import { ReportsService } from './reports.service';
import { ModerationService } from './moderation.service';
import { MessagesModule } from '../messages/messages.module';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminModerationController } from './admin-moderation.controller';

@Global()
@Module({
  controllers: [ReportsController, AdminReportsController, AdminModerationController],
  providers: [TextFilterService, ReportsService, ModerationService],
  exports: [TextFilterService, ReportsService],
  imports: [MessagesModule],
})
export class ModerationModule {}
