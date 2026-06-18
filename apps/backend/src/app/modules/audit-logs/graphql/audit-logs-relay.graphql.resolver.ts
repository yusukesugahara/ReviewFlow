import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  connectionFromOffsetPage,
  fromOffsetCursor,
} from '../../../../common/graphql/relay-pagination';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { AuditLogsQueryDto } from '../dto/audit-logs.dto';
import { AuditLogsService } from '../services/audit-logs.service';
import { toAuditLogGql } from './audit-logs.graphql.mapper';
import {
  AuditLogConnectionGql,
  AuditLogsFilterInputGql,
} from './audit-logs.graphql.types';

@Resolver()
export class AuditLogsRelayGraphqlResolver {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Query(() => AuditLogConnectionGql, {
    name: 'auditLogsConnection',
    description: 'tenant監査ログ一覧をRelay Connection形式で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN)
  async listAuditLogsConnection(
    @Args('input', { type: () => AuditLogsFilterInputGql, nullable: true })
    input: AuditLogsFilterInputGql | null,
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<AuditLogConnectionGql> {
    const offset = after ? fromOffsetCursor(after) + 1 : 0;
    const query = toValidatedInput(AuditLogsQueryDto, {
      ...(input ?? {}),
      limit: first,
      offset,
    });
    const result = await this.auditLogs.listByTenant(actor.tenantId, query);

    return connectionFromOffsetPage({
      nodes: result.logs.map(toAuditLogGql),
      offset: result.offset,
      totalCount: result.total,
    });
  }
}
