import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWikiPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  changelog?: string;

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  featured?: boolean;

  @IsOptional()
  @IsString()
  featuredAt?: string | null;
}
