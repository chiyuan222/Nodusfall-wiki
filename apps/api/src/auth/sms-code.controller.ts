import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SmsCodeService } from './sms-code.service';
import { SendSmsCodeDto } from './dto/send-sms-code.dto';

@Controller('auth/sms-codes')
export class SmsCodeController {
  constructor(private readonly smsCodeService: SmsCodeService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async send(@Body() dto: SendSmsCodeDto): Promise<void> {
    await this.smsCodeService.sendCode(dto.phone);
  }
}
