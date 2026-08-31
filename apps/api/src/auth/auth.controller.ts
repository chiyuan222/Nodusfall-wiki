import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthSessionDto } from './dto/auth-session.dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(@Body() dto: AuthSessionDto) {
    return { data: await this.authService.createSession(dto) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.authService.deleteSession(sessionId, req.user.sub);
  }
}
