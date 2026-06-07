import { Injectable } from '@nestjs/common';
import {
  AuditLogsRepository,
  type CreateAuditLogParams,
} from '../../../../models/repositories/audit-logs.repository';
import type { AuditLogsQueryDto } from '../dto/audit-logs.dto';
import { mapAuditLogToDto } from '../mappers/audit-logs.mapper';

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async create(params: CreateAuditLogParams): Promise<void> {
    await this.auditLogsRepository.create(params);
  }

  async listByTenant(tenantId: string, query: AuditLogsQueryDto) {
    const rows = await this.auditLogsRepository.listByTenant(tenantId, query);
    return rows.map(mapAuditLogToDto);
  }
}
