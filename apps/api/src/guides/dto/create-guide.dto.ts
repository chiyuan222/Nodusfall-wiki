import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateGuideDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsString()
  relatedCharacter?: string;

  @IsOptional()
  @IsString()
  coverImage?: string | null;
}
