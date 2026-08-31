import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/pagination';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q: string,
    @Query('kind') kind: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.searchService.search(q, kind ?? 'all', pagination.page, pagination.perPage);
  }
}
