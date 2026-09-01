import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDirectMessageDto {
  @IsUUID()
  recipientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
