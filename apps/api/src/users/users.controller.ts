import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  toUserResponse,
  toUserSummary,
  UsersService,
} from './users.service';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForumService } from '../forum/forum.service';
import { PaginationQueryDto } from '../common/pagination';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly forumService: ForumService,
  ) {}

  @Post()
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    return { data: toUserResponse(user) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return { data: toUserResponse(user) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMeDto,
  ) {
    const user = await this.usersService.update(req.user.sub, dto);
    return { data: toUserResponse(user) };
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return { data: toUserSummary(user) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/threads')
  listMyThreads(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.forumService.myThreads(req.user.sub, pagination.page, pagination.perPage);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/bookmarks')
  listMyBookmarks(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.forumService.myBookmarks(req.user.sub, pagination.page, pagination.perPage);
  }
}
