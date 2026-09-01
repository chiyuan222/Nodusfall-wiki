import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { StatsService } from './stats.service';

@Injectable()
export class StatsMiddleware implements NestMiddleware {
  constructor(private readonly statsService: StatsService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    try {
      this.statsService.record(req);
    } catch {
      // 统计失败不阻塞请求
    }
    next();
  }
}
