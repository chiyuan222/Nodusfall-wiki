import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasPermission, isManagerRole, PERMISSIONS } from '../common/roles';
import { ReportsService } from './reports.service';

class ListReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;

  @IsOptional()
  @IsIn(['PENDING', 'RESOLVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsIn(['forumThread', 'forumPost', 'comment', 'wikiPage', 'guide'])
  targetType?: string;
}

class HandleReportDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

interface AdminRequest extends Request {
  user: { sub: string; role: string; permissions: string[] };
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private assert(req: AdminRequest): void {
    if (
      !isManagerRole(req.user.role) ||
      !hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_CONTENT)
    ) {
      throw new ForbiddenException('moderator only');
    }
  }

  @Get()
  list(@Req() req: AdminRequest, @Query() query: ListReportsQueryDto) {
    this.assert(req);
    return this.reportsService.list(query);
  }

  @Patch(':reportId')
  handle(
    @Req() req: AdminRequest,
    @Param('reportId') reportId: string,
    @Body() dto: HandleReportDto,
  ) {
    this.assert(req);
    return this.reportsService
      .handle(reportId, req.user.sub, dto.status, dto.note)
      .then((data) => ({ data }));
  }
}
