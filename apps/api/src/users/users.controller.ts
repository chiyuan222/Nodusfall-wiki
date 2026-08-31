import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicUser, toPublicUser, UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async register(@Body() dto: RegisterDto): Promise<PublicUser> {
    const user = await this.usersService.register(dto);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<PublicUser> {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMeDto,
  ): Promise<PublicUser> {
    const user = await this.usersService.update(req.user.sub, dto);
    return toPublicUser(user);
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('userId') userId: string): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return toPublicUser(user);
  }
}
