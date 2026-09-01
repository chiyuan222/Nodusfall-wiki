import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ContentModule } from './content/content.module';
import { HomeModule } from './home/home.module';
import { StatsModule } from './stats/stats.module';
import { StatsMiddleware } from './stats/stats.middleware';
import { MessagesModule } from './messages/messages.module';
import { VideosModule } from './videos/videos.module';
import { SiteModule } from './site/site.module';
import { ExpModule } from './exp/exp.module';
import { AuditModule } from './audit/audit.module';

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
    ContentModule,
    HomeModule,
    StatsModule,
    MessagesModule,
    VideosModule,
    SiteModule,
    ExpModule,
    AuditModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(StatsMiddleware).forRoutes('*');
  }
}
