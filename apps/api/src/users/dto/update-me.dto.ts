import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ProfilePrivacyDto {
  @IsOptional()
  @IsBoolean()
  showThreads?: boolean;

  @IsOptional()
  @IsBoolean()
  showComments?: boolean;

  @IsOptional()
  @IsBoolean()
  showBookmarks?: boolean;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfilePrivacyDto)
  privacy?: ProfilePrivacyDto;
}
