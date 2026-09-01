import {
  Body,
  Controller,
  ForbiddenException,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasPermission, PERMISSIONS } from '../common/roles';
import { UpdateFloatingWindowsDto } from './dto/update-floating-windows.dto';
import { UpdateSectionsDto } from './dto/update-sections.dto';
import { SiteService } from './site.service';

interface AdminRequest extends Request {
  user: { role: string; permissions: string[] };
}

@Controller('admin/site')
@UseGuards(JwtAuthGuard)
export class AdminSiteController {
  constructor(private readonly siteService: SiteService) {}

  private assert(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CMS)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Put('sections')
  async sections(@Req() req: AdminRequest, @Body() dto: UpdateSectionsDto) {
    this.assert(req);
    return { data: await this.siteService.updateSections(dto as Record<string, boolean>) };
  }

  @Put('floating-windows')
  async floatingWindows(
    @Req() req: AdminRequest,
    @Body() dto: UpdateFloatingWindowsDto,
  ) {
    this.assert(req);
    return {
      data: await this.siteService.updateFloatingWindows({
        left: dto.left,
        right: dto.right,
      }),
    };
  }
}
