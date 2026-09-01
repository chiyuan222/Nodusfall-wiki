import { IsString, Matches } from 'class-validator';

export class BindPhoneDto {
  @Matches(/^1[3-9]\d{9}$/)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  smsCode!: string;
}
