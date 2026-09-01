import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class FloatingWindowInput {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  linkUrl?: string | null;
}

export class UpdateFloatingWindowsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FloatingWindowInput)
  left?: FloatingWindowInput;

  @IsOptional()
  @ValidateNested()
  @Type(() => FloatingWindowInput)
  right?: FloatingWindowInput;
}
