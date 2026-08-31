import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): {
    data: {
      status: 'ok';
      version: string;
      dependencies: Record<string, string>;
    };
  } {
    return {
      data: {
        status: 'ok',
        version: '1.0.0',
        dependencies: {
          database: 'ok',
          cache: 'ok',
        },
      },
    };
  }
}
