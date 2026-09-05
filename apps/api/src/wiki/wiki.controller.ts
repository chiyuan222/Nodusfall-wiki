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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { ListWikiPagesQueryDto } from './dto/list-wiki-pages-query.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import { WikiService } from './wiki.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
    permissions: string[];
    status: string;
    wikiCreateGranted: boolean;
  };
}

interface OptionalRequest extends Request {
  user?: { sub: string; role: string; permissions: string[] };
}

@Controller('wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get('categories')
  listCategories() {
    return this.wikiService.listCategories().then((categories) => ({ data: categories }));
  }

  @Get('pages')
  @UseGuards(OptionalJwtAuthGuard)
  listPages(@Req() req: OptionalRequest, @Query() query: ListWikiPagesQueryDto) {
    return this.wikiService.listPages({
      category: query.category,
      tag: query.tag,
      q: query.q,
      status: query.status?.toUpperCase() as any,
      page: query.page,
      perPage: query.perPage,
      sort: query.sort,
      mine: query.mine,
    }, req.user?.sub, req.user
      ? { role: req.user.role, permissions: req.user.permissions }
      : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pages')
  createPage(@Req() req: AuthenticatedRequest, @Body() dto: CreateWikiPageDto) {
    return this.wikiService
      .createPage(req.user.sub, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
        status: req.user.status,
        wikiCreateGranted: req.user.wikiCreateGranted,
      })
      .then((data) => ({ data }));
  }

  @Get('pages/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  getPage(@Req() req: OptionalRequest, @Param('slug') slug: string) {
    return this.wikiService
      .getPage(slug, req.user?.sub, req.user
        ? { role: req.user.role, permissions: req.user.permissions }
        : undefined)
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('pages/:slug')
  updatePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateWikiPageDto,
  ) {
    return this.wikiService
      .updatePage(req.user.sub, slug, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
      })
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('pages/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.deletePage(req.user.sub, slug, {
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('pages/:slug/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.likePage(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('pages/:slug/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.unlikePage(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Put('pages/:slug/dislike')
  @HttpCode(HttpStatus.NO_CONTENT)
  async dislikePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.dislikePage(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('pages/:slug/dislike')
  @HttpCode(HttpStatus.NO_CONTENT)
  async undislikePage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.undislikePage(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Put('pages/:slug/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bookmarkPage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.bookmarkPage(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('pages/:slug/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbookmarkPage(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.wikiService.unbookmarkPage(req.user.sub, slug);
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
