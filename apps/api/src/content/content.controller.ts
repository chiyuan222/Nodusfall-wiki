import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { isManagerRole } from '../common/roles';
import { ContentService } from './content.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller()
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly auditService: AuditService,
  ) {}

  @Get('content/pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.contentService.get(slug).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/content/pages/:slug')
  putPage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() body: any,
  ) {
    if (!isManagerRole(req.user.role)) {
      throw new ForbiddenException('admin only');
    }
    return this.contentService.put(slug, body).then((data) => {
      void this.auditService.log(
        req.user.sub,
        'cms.page.update',
        'contentPage',
        slug,
        `保存 CMS 页面「${slug}」`,
      );
      return { data };
    });
  }
}
