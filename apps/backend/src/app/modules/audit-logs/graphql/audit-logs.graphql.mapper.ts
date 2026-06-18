import {
  AUDIT_LOG_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { AuditLogItemDto } from '../dto/audit-logs.dto';
import type { AuditLogGql } from './audit-logs.graphql.types';

export function toAuditLogGql(log: AuditLogItemDto): AuditLogGql {
  return {
    __typename: 'AuditLog',
    ...log,
    id: toRelayGlobalId(AUDIT_LOG_RELAY_NODE_TYPE, log.id),
    databaseId: log.id,
  };
}
