import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateForumThreadDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsUrl()
  coverImage?: string | null;
}
