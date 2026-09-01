import { IsString, MinLength } from 'class-validator';

export class DeleteMeDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
