import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const MEDIA_PATTERN = /^(\/uploads\/[A-Za-z0-9._-]+|https?:\/\/\S+)$/;

export class CreateVideoShareDto {
  @IsIn(['official', 'analysis', 'gameplay'])
  kind!: 'official' | 'analysis' | 'gameplay';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsIn(['bilibili', 'douyin', 'youtube', 'other'])
  platform?: string;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_PATTERN)
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class UpdateVideoShareDto {
  @IsOptional()
  @IsIn(['official', 'analysis', 'gameplay'])
  kind?: 'official' | 'analysis' | 'gameplay';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsIn(['bilibili', 'douyin', 'youtube', 'other'])
  platform?: string;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_PATTERN)
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
