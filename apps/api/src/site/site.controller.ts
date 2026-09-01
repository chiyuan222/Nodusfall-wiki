import { Controller, Get } from '@nestjs/common';
import { SiteService } from './site.service';

@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('sections')
  async sections() {
    return { data: await this.siteService.getSections() };
  }

  @Get('floating-windows')
  async floatingWindows() {
    return { data: await this.siteService.getFloatingWindows() };
  }
}
