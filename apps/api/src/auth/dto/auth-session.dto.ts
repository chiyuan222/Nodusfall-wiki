import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class AuthSessionDto {
  @IsIn(['password', 'refreshToken'])
  grantType!: 'password' | 'refreshToken';

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'password')
  @IsEmail()
  email?: string;

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'password')
  @IsString()
  password?: string;

  @ValidateIf((o: AuthSessionDto) => o.grantType === 'refreshToken')
  @IsString()
  refreshToken?: string;
}
