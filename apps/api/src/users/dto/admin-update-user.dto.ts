import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const PERMISSION_ENUM = [
  'manage_users',
  'manage_content',
  'manage_forum',
  'manage_cms',
  'manage_deletion',
  'grant_wiki_create',
];

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['normal', 'verified', 'premium'])
  group?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
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
  @IsArray()
  @IsIn(PERMISSION_ENUM, { each: true })
  permissions?: string[];

  @IsOptional()
  @IsIn(['member', 'editor', 'moderator', 'admin'])
  role?: string;
}
