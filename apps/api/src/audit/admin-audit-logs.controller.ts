import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { isOwner } from '../common/roles';
import { AuditService } from './audit.service';

class AuditLogsQueryDto {
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
  @IsString()
  action?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

interface OwnerRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard)
export class AdminAuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Req() req: OwnerRequest, @Query() query: AuditLogsQueryDto) {
    if (!isOwner(req.user.role)) {
      throw new ForbiddenException('owner only');
    }
    return this.auditService.list(query);
  }
}
