import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../../models/entities/audit-log.entity';
import { AuditLogsRepository } from '../../../models/repositories/audit-logs.repository';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogsBusinessGraphqlResolver } from './graphql/audit-logs-business.graphql.resolver';
import { AuditLogsRelayGraphqlResolver } from './graphql/audit-logs-relay.graphql.resolver';
import { BusinessAuditLogService } from './services/business-audit-log.service';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogsBusinessGraphqlResolver,
    AuditLogsRelayGraphqlResolver,
    BusinessAuditLogService,
    AuditLogsRepository,
  ],
  exports: [AuditLogsService, BusinessAuditLogService],
})
export class AuditLogsModule {}
