import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';

export class AppearanceHeadingInput {
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null;

  @IsOptional()
  @IsIn(['serif', 'sans', 'kaiti'])
  fontFamily?: string | null;

  @IsOptional()
  @IsIn([400, 500, 600, 700, 800])
  fontWeight?: number | null;
}

export class UpdateAppearanceDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AppearanceHeadingInput)
  heading?: AppearanceHeadingInput;
}
