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
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasPermission, PERMISSIONS } from '../common/roles';
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
  @IsIn(['forumThread', 'forumPost', 'comment', 'wikiPage', 'guide', 'user'])
  targetType?: string;
}

class DisciplineDto {
  @IsIn(['mute', 'ban'])
  action!: 'mute' | 'ban';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;
}

class HandleReportDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DisciplineDto)
  discipline?: DisciplineDto;
}

interface AdminRequest extends Request {
  user: { sub: string; role: string; permissions: string[] };
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private assert(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_REPORTS)) {
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
      .handle(reportId, req.user.sub, dto.status, dto.note, dto.discipline, {
        role: req.user.role,
        permissions: req.user.permissions,
      })
      .then((data) => ({ data }));
  }
}
