import { IsInt, IsOptional, IsString, Max } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsInt()
  @Max(10485760)
  size?: number;
}
