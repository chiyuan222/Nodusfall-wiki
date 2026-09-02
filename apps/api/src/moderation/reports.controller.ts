import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

class CreateReportDto {
  @IsIn(['forumThread', 'forumPost', 'comment', 'wikiPage', 'guide', 'user'])
  targetType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  targetId!: string;

  @IsIn(['spam', 'porn', 'politics', 'violence', 'illegal', 'other'])
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthRequest, @Body() dto: CreateReportDto) {
    return { data: await this.reportsService.create(req.user.sub, dto) };
  }
}
