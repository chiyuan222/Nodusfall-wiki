import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class AuthSessionDto {
  @IsIn(['password', 'refreshToken'])
  grantType!: 'password' | 'refreshToken';

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'password' && !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'password' && !o.email)
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'password')
  @IsString()
  password?: string;

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'refreshToken')
  @IsString()
  refreshToken?: string;
}
