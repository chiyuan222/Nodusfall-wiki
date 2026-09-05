import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export class AdminListFeedbackQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'REPLIED', 'CLOSED'])
  status?: string;
}
