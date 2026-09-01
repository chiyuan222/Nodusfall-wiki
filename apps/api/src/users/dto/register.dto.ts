import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[\w\-\u4e00-\u9fa5]+$/)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ValidateIf((o: RegisterDto) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o: RegisterDto) => Boolean(o.email))
  @IsString()
  @Matches(/^\d{6}$/)
  emailCode?: string;

  @ValidateIf((o: RegisterDto) => !o.email)
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @ValidateIf((o: RegisterDto) => Boolean(o.phone))
  @IsString()
  @Matches(/^\d{6}$/)
  smsCode?: string;
}
