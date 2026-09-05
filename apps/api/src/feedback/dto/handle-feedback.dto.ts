import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class HandleFeedbackDto {
  @IsIn(['REPLIED', 'CLOSED'])
  status!: 'REPLIED' | 'CLOSED';

  @IsOptional()
  @ValidateIf((o: HandleFeedbackDto) => o.status === 'REPLIED')
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  replyText?: string;
}
