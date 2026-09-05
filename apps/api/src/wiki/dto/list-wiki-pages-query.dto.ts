import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination';

export class ListWikiPagesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'title'])
  sort?: 'updatedAt' | 'createdAt' | 'title';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mine?: boolean;
}
