import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WikiModule } from './wiki/wiki.module';
import { GuidesModule } from './guides/guides.module';
import { ForumModule } from './forum/forum.module';
import { CommentsModule } from './comments/comments.module';
import { SearchModule } from './search/search.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WikiModule,
    GuidesModule,
    ForumModule,
    CommentsModule,
    SearchModule,
    UploadsModule,
  ],
})
export class AppModule {}
