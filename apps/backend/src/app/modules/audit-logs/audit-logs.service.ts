import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { AuditLog } from '../../../models/entities/audit-log.entity';
import type { AuditLogsQueryDto } from './audit-logs.dto';
import { mapAuditLogToDto } from './audit-logs.mapper';

type CreateAuditLogParams = {
  tenantId: string;
  groupId?: string | null;
  actorUserId: string | null;
  actionType: string;
  targetType: string;
  targetId: string | null;
  metadataJson: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async create(params: CreateAuditLogParams): Promise<void> {
    await this.auditLogs.save(
      this.auditLogs.create({
        tenantId: params.tenantId,
        groupId: params.groupId ?? null,
        actorUserId: params.actorUserId,
        actionType: params.actionType,
        targetType: params.targetType,
        targetId: params.targetId,
        metadataJson: params.metadataJson,
      }),
    );
  }

  async listByTenant(tenantId: string, query: AuditLogsQueryDto) {
    const limit = query.limit ?? 50;
    const where = query.actionType?.trim().length
      ? { tenantId, actionType: Like(`${query.actionType.trim()}%`) }
      : { tenantId };
    const rows = await this.auditLogs.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map(mapAuditLogToDto);
  }
}
