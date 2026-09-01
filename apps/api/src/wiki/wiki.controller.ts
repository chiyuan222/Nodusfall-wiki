import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { ListWikiPagesQueryDto } from './dto/list-wiki-pages-query.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import { WikiService } from './wiki.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get('categories')
  listCategories() {
    return this.wikiService.listCategories().then((categories) => ({ data: categories }));
  }

  @Get('pages')
  listPages(@Query() query: ListWikiPagesQueryDto) {
    return this.wikiService.listPages({
      category: query.category,
      tag: query.tag,
      q: query.q,
      status: query.status?.toUpperCase() as any,
      page: query.page,
      perPage: query.perPage,
      sort: query.sort,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('pages')
  createPage(@Req() req: AuthenticatedRequest, @Body() dto: CreateWikiPageDto) {
    return this.wikiService.createPage(req.user.sub, dto).then((data) => ({ data }));
  }

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.wikiService.getPage(slug).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('pages/:slug')
  updatePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateWikiPageDto,
  ) {
    return this.wikiService.updatePage(req.user.sub, slug, dto).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('pages/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(@Param('slug') slug: string): Promise<void> {
    await this.wikiService.deletePage(slug);
  }

  @Get('pages/:slug/revisions')
  listRevisions(@Param('slug') slug: string, @Query() pagination: PaginationQueryDto) {
    return this.wikiService.listRevisions(slug, pagination.page, pagination.perPage);
  }

  @Get('pages/:slug/revisions/:revisionId')
  getRevision(
    @Param('slug') slug: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.wikiService.getRevision(slug, revisionId).then((data) => ({ data }));
  }
}
