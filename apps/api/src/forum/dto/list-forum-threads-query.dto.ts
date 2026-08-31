import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export class ListForumThreadsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['lastPostAt', 'createdAt'])
  sort?: 'lastPostAt' | 'createdAt';
}
