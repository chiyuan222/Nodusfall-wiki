import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVideoDto {
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
  @IsUrl({ require_protocol: true })
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
