import { IsIn, IsString } from 'class-validator';

export class CreateHistoryDto {
  @IsIn(['wikiPage', 'guide', 'forumThread'])
  kind!: 'wikiPage' | 'guide' | 'forumThread';

  @IsString()
  slug!: string;
}
