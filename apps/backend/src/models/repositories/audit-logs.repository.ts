import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog, type AuditActorType } from '../entities/audit-log.entity';
import type { ApplicationStatusValue } from '../constants/application-status';
import type { GroupMemberRoleValue } from '../constants/group-member-role';
import type { UserRoleValue } from '../constants/user-role';

export type CreateAuditLogParams = {
  tenantId: string;
  groupId?: string | null;
  actorUserId: string | null;
  actorType: AuditActorType;
  actorEmailSnapshot?: string | null;
  actionType: string;
  targetType: string;
  targetId: string | null;
  targetUserId?: string | null;
  targetEmailSnapshot?: string | null;
  applicationId?: string | null;
  statusFrom?: ApplicationStatusValue | null;
  statusTo?: ApplicationStatusValue | null;
  stepOrderFrom?: number | null;
  stepOrderTo?: number | null;
  roleFrom?: UserRoleValue | null;
  roleTo?: UserRoleValue | null;
  groupRoleFrom?: GroupMemberRoleValue | null;
  groupRoleTo?: GroupMemberRoleValue | null;
  summary: string;
  metadataJson: Record<string, unknown> | null;
};

export type AuditLogListQuery = {
  limit?: number;
  offset?: number;
  actionType?: string;
  applicationId?: string;
  groupId?: string;
  targetUserId?: string;
  targetType?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type AuditLogListResult = {
  rows: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class AuditLogsRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async create(
    params: CreateAuditLogParams,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager?.getRepository(AuditLog) ?? this.auditLogs;
    await repository.save(
      repository.create({
        tenantId: params.tenantId,
        groupId: params.groupId ?? null,
        actorUserId: params.actorUserId,
        actorType: params.actorType,
        actorEmailSnapshot: params.actorEmailSnapshot ?? null,
        actionType: params.actionType,
        targetType: params.targetType,
        targetId: params.targetId,
        targetUserId: params.targetUserId ?? null,
        targetEmailSnapshot: params.targetEmailSnapshot ?? null,
        applicationId: params.applicationId ?? null,
        statusFrom: params.statusFrom ?? null,
        statusTo: params.statusTo ?? null,
        stepOrderFrom: params.stepOrderFrom ?? null,
        stepOrderTo: params.stepOrderTo ?? null,
        roleFrom: params.roleFrom ?? null,
        roleTo: params.roleTo ?? null,
        groupRoleFrom: params.groupRoleFrom ?? null,
        groupRoleTo: params.groupRoleTo ?? null,
        summary: params.summary,
        metadataJson: params.metadataJson,
      }),
    );
  }

  async listByTenant(
    tenantId: string,
    query: AuditLogListQuery,
  ): Promise<AuditLogListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const actionType = query.actionType?.trim();
    const keyword = query.q?.trim();
    const builder = this.auditLogs
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actorUser', 'actorUser')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .orderBy('auditLog.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (actionType) {
      builder.andWhere('auditLog.actionType LIKE :actionType', {
        actionType: `${escapeLike(actionType)}%`,
      });
    }
    if (query.targetType?.trim()) {
      builder.andWhere('auditLog.targetType = :targetType', {
        targetType: query.targetType.trim(),
      });
    }
    if (query.applicationId?.trim()) {
      builder.andWhere('auditLog.applicationId = :applicationId', {
        applicationId: query.applicationId.trim(),
      });
    }
    if (query.groupId?.trim()) {
      builder.andWhere('auditLog.groupId = :groupId', {
        groupId: query.groupId.trim(),
      });
    }
    if (query.targetUserId?.trim()) {
      builder.andWhere('auditLog.targetUserId = :targetUserId', {
        targetUserId: query.targetUserId.trim(),
      });
    }
    if (keyword) {
      const q = `%${escapeLike(keyword)}%`;
      builder.andWhere(
        `(${[
          'auditLog.actionType LIKE :q',
          'auditLog.targetType LIKE :q',
          'auditLog.targetId LIKE :q',
          'CAST(auditLog.actorUserId AS text) LIKE :q',
          'auditLog.actorEmailSnapshot LIKE :q',
          'CAST(auditLog.targetUserId AS text) LIKE :q',
          'auditLog.targetEmailSnapshot LIKE :q',
          'CAST(auditLog.applicationId AS text) LIKE :q',
          'auditLog.summary LIKE :q',
          'CAST(auditLog.groupId AS text) LIKE :q',
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

    const [rows, total] = await builder.getManyAndCount();
    return { rows, total, limit, offset };
  }

  findOneByIdInTenant(tenantId: string, id: string): Promise<AuditLog | null> {
    return this.auditLogs.findOne({
      where: { id, tenantId },
      relations: { actorUser: true },
    });
  }
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}
