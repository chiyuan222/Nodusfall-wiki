import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { EmailCodeService } from './email-code.service';
import { SendEmailCodeDto } from './dto/send-email-code.dto';

@Controller('auth/email-codes')
export class EmailCodeController {
  constructor(private readonly emailCodeService: EmailCodeService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async send(@Body() dto: SendEmailCodeDto): Promise<void> {
    await this.emailCodeService.sendCode(dto.email);
  }
}
