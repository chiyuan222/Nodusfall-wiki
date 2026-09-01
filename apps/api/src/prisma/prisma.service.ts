import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      console.warn(
        '数据库不可用，已以无数据库模式启动；/v1/health 可用，数据接口需要 PostgreSQL 后恢复。',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
