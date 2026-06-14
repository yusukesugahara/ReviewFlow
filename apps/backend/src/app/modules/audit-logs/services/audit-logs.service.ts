import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from '../../../../models/repositories/audit-logs.repository';
import type { AuditLogsQueryDto } from '../dto/audit-logs.dto';
import { mapAuditLogToDto } from '../mappers/audit-logs.mapper';

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async listByTenant(tenantId: string, query: AuditLogsQueryDto) {
    const result = await this.auditLogsRepository.listByTenant(tenantId, query);
    return {
      logs: result.rows.map(mapAuditLogToDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
