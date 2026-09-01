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
import { CreateGuideDto } from './dto/create-guide.dto';
import { ListGuidesQueryDto } from './dto/list-guides-query.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { GuidesService } from './guides.service';

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
  user?: { sub: string };
}

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@Req() req: OptionalRequest, @Query() query: ListGuidesQueryDto) {
    return this.guidesService.list({
      tag: query.tag,
      q: query.q,
      status: query.status?.toUpperCase() as any,
      sort: query.sort,
      page: query.page,
      perPage: query.perPage,
    }, req.user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGuideDto) {
    return this.guidesService
      .create(req.user.sub, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
        status: req.user.status,
        wikiCreateGranted: req.user.wikiCreateGranted,
      })
      .then((data) => ({ data }));
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  get(@Req() req: OptionalRequest, @Param('slug') slug: string) {
    return this.guidesService.get(slug, req.user?.sub).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateGuideDto,
  ) {
    return this.guidesService
      .update(req.user.sub, slug, dto, {
        role: req.user.role,
        permissions: req.user.permissions,
      })
      .then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.guidesService.delete(req.user.sub, slug, {
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':slug/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.guidesService.likeGuide(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.guidesService.unlikeGuide(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':slug/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bookmark(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.guidesService.bookmarkGuide(req.user.sub, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbookmark(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.guidesService.unbookmarkGuide(req.user.sub, slug);
  }

  @Get(':slug/ratings')
  @UseGuards(OptionalJwtAuthGuard)
  getRating(@Req() req: Request, @Param('slug') slug: string) {
    const userId = (req as any).user?.sub;
    return this.guidesService.getRating(slug, userId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/ratings')
  rate(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body('score') score: number,
  ) {
    return this.guidesService.rate(req.user.sub, slug, score).then((data) => ({ data }));
  }
}
