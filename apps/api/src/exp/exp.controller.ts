import { Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination';
import { ExpService } from './exp.service';

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class ExpController {
  constructor(private readonly expService: ExpService) {}

  @Get('checkin')
  async status(@Req() req: AuthRequest) {
    return { data: await this.expService.status(req.user.sub) };
  }

  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  async checkIn(@Req() req: AuthRequest) {
    return { data: await this.expService.checkIn(req.user.sub) };
  }

  @Get('exp-log')
  expLog(@Req() req: AuthRequest, @Query() pagination: PaginationQueryDto) {
    return this.expService.expLog(req.user.sub, pagination.page, pagination.perPage);
  }
}
