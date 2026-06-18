import { Args, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { AuditLogsQueryDto } from '../dto/audit-logs.dto';
import { AuditLogsService } from '../services/audit-logs.service';

@Resolver()
export class AuditLogsBusinessGraphqlResolver {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Query(() => GraphQLJSON, { name: 'auditLogs' })
  @Roles(UserRole.TENANT_ADMIN)
  list(
    @CurrentUser() actor: AuthUserPayload,
    @Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
  ) {
    return this.auditLogs.listByTenant(
      actor.tenantId,
      toValidatedInput(AuditLogsQueryDto, input ?? {}),
    );
  }
}
