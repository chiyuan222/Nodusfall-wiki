import { Module } from '@nestjs/common';
import { AdminSiteController } from './admin-site.controller';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({
  controllers: [SiteController, AdminSiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
