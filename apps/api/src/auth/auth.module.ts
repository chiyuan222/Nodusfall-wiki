import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailCodeController } from './email-code.controller';
import { EmailCodeService } from './email-code.service';
import { SmsCodeController } from './sms-code.controller';
import { SmsCodeService } from './sms-code.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController, EmailCodeController, SmsCodeController],
  providers: [AuthService, EmailCodeService, SmsCodeService, JwtStrategy],
  exports: [AuthService, EmailCodeService, SmsCodeService],
})
export class AuthModule {}
