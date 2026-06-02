import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const actionType = query.actionType?.trim();
    const keyword = query.q?.trim();
    const builder = this.auditLogs
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actorUser', 'actorUser')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .orderBy('auditLog.createdAt', 'DESC')
      .take(limit);

    if (actionType) {
      builder.andWhere('auditLog.actionType LIKE :actionType', {
        actionType: `${escapeLike(actionType)}%`,
      });
    }
    if (keyword) {
      const q = `%${escapeLike(keyword)}%`;
      builder.andWhere(
        `(${[
          'auditLog.actionType LIKE :q',
          'auditLog.targetType LIKE :q',
          'auditLog.targetId LIKE :q',
          'auditLog.actorUserId LIKE :q',
          'auditLog.groupId LIKE :q',
          'actorUser.email LIKE :q',
        ].join(' OR ')})`,
        { q },
      );
    }
    if (query.createdFrom) {
      builder.andWhere('auditLog.createdAt >= :createdFrom', {
        createdFrom: new Date(query.createdFrom),
      });
    }
    if (query.createdTo) {
      builder.andWhere('auditLog.createdAt <= :createdTo', {
        createdTo: new Date(query.createdTo),
      });
    }

    const rows = await builder.getMany();
    return rows.map(mapAuditLogToDto);
  }
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}
