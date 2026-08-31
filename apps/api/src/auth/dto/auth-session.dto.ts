import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class AuthSessionDto {
  @IsIn(['password', 'refreshToken'])
  grantType!: 'password' | 'refreshToken';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;
}
