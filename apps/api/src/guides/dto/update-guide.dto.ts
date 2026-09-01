import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateGuideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

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
