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
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { GuidesService } from './guides.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  list(
    @Query() pagination: PaginationQueryDto,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
    @Query('status') status?: any,
    @Query('sort') sort?: any,
  ) {
    return this.guidesService.list({
      tag,
      q,
      status,
      sort,
      page: pagination.page,
      perPage: pagination.perPage,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGuideDto) {
    return this.guidesService.create(req.user.sub, dto).then((data) => ({ data }));
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.guidesService.get(slug).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateGuideDto,
  ) {
    return this.guidesService.update(req.user.sub, slug, dto).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('slug') slug: string): Promise<void> {
    await this.guidesService.delete(slug);
  }

  @Get(':slug/ratings')
  getRating(@Param('slug') slug: string) {
    return this.guidesService.getRating(slug).then((data) => ({ data }));
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
