import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSectionsDto {
  @IsOptional()
  @IsBoolean()
  home?: boolean;

  @IsOptional()
  @IsBoolean()
  world?: boolean;

  @IsOptional()
  @IsBoolean()
  wiki?: boolean;

  @IsOptional()
  @IsBoolean()
  guides?: boolean;

  @IsOptional()
  @IsBoolean()
  forum?: boolean;

  @IsOptional()
  @IsBoolean()
  videos?: boolean;
}
