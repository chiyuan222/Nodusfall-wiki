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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { isManagerRole } from '../common/roles';
import { CreateWikiCategoryDto } from './dto/create-wiki-category.dto';
import { UpdateWikiCategoryDto } from './dto/update-wiki-category.dto';
import { WikiService } from './wiki.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/wiki/categories')
@UseGuards(JwtAuthGuard)
export class AdminWikiController {
  constructor(
    private readonly wikiService: WikiService,
    private readonly auditService: AuditService,
  ) {}

  private assertAdmin(req: AuthenticatedRequest): void {
    if (!isManagerRole(req.user.role)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWikiCategoryDto) {
    this.assertAdmin(req);
    const data = await this.wikiService.createCategory(dto);
    await this.auditService.log(
      req.user.sub,
      'wiki.category.create',
      'wikiCategory',
      data.slug,
      `新建 Wiki 分类「${data.name}」`,
    );
    return { data };
  }

  @Patch(':slug')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateWikiCategoryDto,
  ) {
    this.assertAdmin(req);
    const data = await this.wikiService.updateCategory(slug, dto);
    await this.auditService.log(
      req.user.sub,
      'wiki.category.update',
      'wikiCategory',
      slug,
      `修改 Wiki 分类「${data.name}」`,
    );
    return { data };
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    this.assertAdmin(req);
    await this.wikiService.deleteCategory(slug);
    await this.auditService.log(
      req.user.sub,
      'wiki.category.delete',
      'wikiCategory',
      slug,
      `删除 Wiki 分类「${slug}」`,
    );
  }
}
