import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasPermission, PERMISSIONS } from '../common/roles';
import { StatsService } from './stats.service';

interface StatsRequest extends Request {
  user: { role: string; permissions: string[] };
}

@Controller('admin/stats')
@UseGuards(JwtAuthGuard)
export class AdminStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  overview(@Req() req: StatsRequest) {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_USERS)) {
      throw new ForbiddenException('admin only');
    }
    return this.statsService.overview();
  }
}
