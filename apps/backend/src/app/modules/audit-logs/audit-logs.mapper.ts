import type { AuditLog } from '../../../models/entities/audit-log.entity';
import type { AuditLogItemDto } from './audit-logs.dto';

export function mapAuditLogToDto(row: AuditLog): AuditLogItemDto {
  return {
    id: row.id,
    groupId: row.groupId,
    actorUserId: row.actorUserId,
    actorEmail: row.actorUser?.email ?? null,
    actionType: row.actionType,
    targetType: row.targetType,
    targetId: row.targetId,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt.toISOString(),
  };
}
