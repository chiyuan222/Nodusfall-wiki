import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

const PERMISSION_ENUM = [
  'manage_users',
  'manage_content',
  'manage_all_boards',
  'manage_wiki_board',
  'manage_guide_board',
  'manage_forum_board',
  'manage_video_board',
  'manage_reports',
  'grant_wiki_create',
  'grant_guide_create',
  'grant_video_share',
];

const ROLE_ENUM = [
  'member',
  'wiki_editor',
  'guide_editor',
  'video_editor',
  'wiki_moderator',
  'guide_moderator',
  'forum_moderator',
  'video_moderator',
  'admin',
];

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['normal', 'verified', 'premium'])
  group?: string;

  @IsOptional()
  level?: number;

  @IsOptional()
  @IsIn(['active', 'muted', 'banned'])
  status?: string;

  @IsOptional()
  @IsString()
  banReason?: string;

  @IsOptional()
  @ValidateIf((o: AdminUpdateUserDto) => o.banUntil !== null)
  banUntil?: string | null;

  @IsOptional()
  @ValidateIf((o: AdminUpdateUserDto) => o.mutedUntil !== null)
  mutedUntil?: string | null;

  @IsOptional()
  wikiCreateGranted?: boolean;

  @IsOptional()
  guideCreateGranted?: boolean;

  @IsOptional()
  videoShareGranted?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSION_ENUM, { each: true })
  permissions?: string[];

  @IsOptional()
  @IsIn(ROLE_ENUM)
  role?: string;
}
