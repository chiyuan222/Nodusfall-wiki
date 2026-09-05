import { Module } from '@nestjs/common';
import { AdminVideosController } from './admin-videos.controller';
import { VideosController } from './videos.controller';
import { MyVideosController } from './my-videos.controller';
import { VideosService } from './videos.service';

@Module({
  controllers: [VideosController, MyVideosController, AdminVideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
