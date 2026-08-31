import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSessionDto } from './dto/auth-session.dto';

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  createSession(@Body() dto: AuthSessionDto) {
    return this.authService.createSession(dto);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param('sessionId') sessionId: string): Promise<void> {
    await this.authService.deleteSession(sessionId);
  }
}
