import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { AdminGuideCategoriesController } from './admin-guide-categories.controller';
import { GuidesService } from './guides.service';

@Module({
  controllers: [GuidesController, AdminGuideCategoriesController],
  providers: [GuidesService],
})
export class GuidesModule {}
