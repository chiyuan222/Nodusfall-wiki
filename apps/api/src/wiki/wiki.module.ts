import { Module } from '@nestjs/common';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';
import { AdminWikiController } from './admin-wiki.controller';

@Module({
  controllers: [WikiController, AdminWikiController],
  providers: [WikiService],
})
export class WikiModule {}
