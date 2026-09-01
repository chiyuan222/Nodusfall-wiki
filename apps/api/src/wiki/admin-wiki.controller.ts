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
import { CreateWikiCategoryDto } from './dto/create-wiki-category.dto';
import { UpdateWikiCategoryDto } from './dto/update-wiki-category.dto';
import { WikiService } from './wiki.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('admin/wiki/categories')
@UseGuards(JwtAuthGuard)
export class AdminWikiController {
  constructor(private readonly wikiService: WikiService) {}

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('admin only');
    }
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWikiCategoryDto) {
    this.assertAdmin(req);
    return this.wikiService.createCategory(dto).then((data) => ({ data }));
  }

  @Patch(':slug')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateWikiCategoryDto,
  ) {
    this.assertAdmin(req);
    return this.wikiService.updateCategory(slug, dto).then((data) => ({ data }));
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    this.assertAdmin(req);
    await this.wikiService.deleteCategory(slug);
  }
}
