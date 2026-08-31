import { IsString, MaxLength } from 'class-validator';

export class CreateForumPostDto {
  @IsString()
  @MaxLength(20000)
  content!: string;
}
