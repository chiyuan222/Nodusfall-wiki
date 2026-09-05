import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['normal', 'verified', 'premium'])
  group?: string;

  @IsOptional()
  @IsIn([
    'member',
    'wiki_editor',
    'guide_editor',
    'video_editor',
    'wiki_moderator',
    'guide_moderator',
    'forum_moderator',
    'video_moderator',
    'admin',
    'owner',
  ])
  role?: string;

  @IsOptional()
  @IsIn(['active', 'muted', 'banned', 'deleted'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  level?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;
}
