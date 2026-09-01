import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { DigestQueryDto } from './dto/digest-query.dto';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('digest')
  @UseGuards(OptionalJwtAuthGuard)
  digest(@Req() req: Request, @Query() query: DigestQueryDto) {
    const userId = (req as any).user?.sub;
    return this.homeService.digest(query.latestLimit, query.featuredLimit, userId);
  }
}
