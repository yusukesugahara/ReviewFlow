import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../../models/entities/audit-log.entity';
import { AuditLogsRepository } from '../../../models/repositories/audit-logs.repository';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { BusinessAuditLogService } from './services/business-audit-log.service';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, BusinessAuditLogService, AuditLogsRepository],
  exports: [BusinessAuditLogService],
})
export class AuditLogsModule {}
