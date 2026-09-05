import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { hasBoardPermission } from '../common/roles';
import { GuidesService } from './guides.service';

class CreateGuideCategoryDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  sortOrder!: number;
}

class UpdateGuideCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

interface AdminRequest extends Request {
  user: { role: string; permissions: string[] };
}

@Controller('admin/guides/categories')
@UseGuards(JwtAuthGuard)
export class AdminGuideCategoriesController {
  constructor(private readonly guidesService: GuidesService) {}

  private assert(req: AdminRequest): void {
    if (!hasBoardPermission(req.user.role, req.user.permissions, 'guide')) {
      throw new ForbiddenException('admin only');
    }
  }

  @Post()
  async create(@Req() req: AdminRequest, @Body() dto: CreateGuideCategoryDto) {
    this.assert(req);
    return {
      data: await this.guidesService.createGuideCategory(dto),
    };
  }

  @Patch(':slug')
  async update(
    @Req() req: AdminRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateGuideCategoryDto,
  ) {
    this.assert(req);
    return {
      data: await this.guidesService.updateGuideCategory(slug, dto),
    };
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AdminRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    this.assert(req);
    await this.guidesService.deleteGuideCategory(slug);
  }
}
