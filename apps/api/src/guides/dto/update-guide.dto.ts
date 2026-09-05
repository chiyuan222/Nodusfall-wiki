import { IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateGuideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsString()
  relatedCharacter?: string;

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  featured?: boolean;

  @IsOptional()
  @IsString()
  featuredAt?: string | null;
}
