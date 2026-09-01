import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminStatsController } from './admin-stats.controller';
import { StatsMiddleware } from './stats.middleware';
import { StatsService } from './stats.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminStatsController],
  providers: [StatsService, StatsMiddleware],
  exports: [StatsService],
})
export class StatsModule {}
