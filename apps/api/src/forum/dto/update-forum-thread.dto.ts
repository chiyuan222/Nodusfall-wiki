import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateForumThreadDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}
