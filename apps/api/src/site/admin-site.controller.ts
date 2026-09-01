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
import { AuditService } from '../audit/audit.service';
import { hasPermission, PERMISSIONS } from '../common/roles';
import { UpdateFloatingWindowsDto } from './dto/update-floating-windows.dto';
import { UpdateSectionsDto } from './dto/update-sections.dto';
import { SiteService } from './site.service';

interface AdminRequest extends Request {
  user: { sub: string; role: string; permissions: string[] };
}

@Controller('admin/site')
@UseGuards(JwtAuthGuard)
export class AdminSiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly auditService: AuditService,
  ) {}

  private assert(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CMS)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Put('sections')
  async sections(@Req() req: AdminRequest, @Body() dto: UpdateSectionsDto) {
    this.assert(req);
    const data = await this.siteService.updateSections(dto as Record<string, boolean>);
    await this.auditService.log(req.user.sub, 'site.sections.update', 'site', 'sections', '更新站点分区显示开关');
    return { data };
  }

  @Put('floating-windows')
  async floatingWindows(
    @Req() req: AdminRequest,
    @Body() dto: UpdateFloatingWindowsDto,
  ) {
    this.assert(req);
    const data = await this.siteService.updateFloatingWindows({
      left: dto.left,
      right: dto.right,
    });
    await this.auditService.log(req.user.sub, 'site.floating.update', 'site', 'floating-windows', '更新论坛漂浮引流窗');
    return { data };
  }
}
