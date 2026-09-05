import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsIn(['bug', 'suggestion', 'appeal', 'other'])
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  content!: string;
}
