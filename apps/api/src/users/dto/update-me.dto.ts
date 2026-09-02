import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/uploads\/[A-Za-z0-9._-]+|https?:\/\/\S+)$/, {
    message: 'avatarUrl 必须是 /uploads/ 路径或 http(s) 链接',
  })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
