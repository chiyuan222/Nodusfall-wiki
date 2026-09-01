import { Global, Module } from '@nestjs/common';
import { ExpController } from './exp.controller';
import { ExpService } from './exp.service';

@Global()
@Module({
  controllers: [ExpController],
  providers: [ExpService],
  exports: [ExpService],
})
export class ExpModule {}
