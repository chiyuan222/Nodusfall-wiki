import { Matches } from 'class-validator';

export class SendSmsCodeDto {
  @Matches(/^1[3-9]\d{9}$/)
  phone!: string;
}
