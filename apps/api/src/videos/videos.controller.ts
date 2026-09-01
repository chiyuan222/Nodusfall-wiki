import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { VideosService } from './videos.service';

class ListVideosQueryDto {
  @IsOptional()
  @IsIn(['official', 'analysis', 'gameplay'])
  kind?: 'official' | 'analysis' | 'gameplay';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;
}

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  list(@Query() query: ListVideosQueryDto) {
    return this.videosService.listPublic(query.kind, query.page, query.perPage);
  }
}
