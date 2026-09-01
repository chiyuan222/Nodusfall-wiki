import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateForumBoardDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
