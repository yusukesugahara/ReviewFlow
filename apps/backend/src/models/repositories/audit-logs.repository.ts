import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export type CreateAuditLogParams = {
  tenantId: string;
  groupId?: string | null;
  actorUserId: string | null;
  actionType: string;
  targetType: string;
  targetId: string | null;
  metadataJson: Record<string, unknown> | null;
};

export type AuditLogListQuery = {
  limit?: number;
  actionType?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

@Injectable()
export class AuditLogsRepository {
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

  async listByTenant(
    tenantId: string,
    query: AuditLogListQuery,
  ): Promise<AuditLog[]> {
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

    return builder.getMany();
  }
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}
