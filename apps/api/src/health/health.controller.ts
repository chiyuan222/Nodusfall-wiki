import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): {
    status: 'ok';
    version: string;
    dependencies: Record<string, string>;
  } {
    return {
      status: 'ok',
      version: '1.0.0',
      dependencies: {
        database: 'postgresql',
        cache: 'redis',
      },
    };
  }
}
