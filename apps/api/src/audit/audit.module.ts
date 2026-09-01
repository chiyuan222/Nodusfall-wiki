import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminAuditLogsController } from './admin-audit-logs.controller';

@Global()
@Module({
  controllers: [AdminAuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
