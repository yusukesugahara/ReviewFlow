import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  APPLICATION_RELAY_NODE_TYPE,
  APPROVAL_FLOW_RELAY_NODE_TYPE,
  AUDIT_LOG_RELAY_NODE_TYPE,
  EXPORT_JOB_RELAY_NODE_TYPE,
  FORM_DEFINITION_RELAY_NODE_TYPE,
  fromRelayGlobalId,
  GROUP_RELAY_NODE_TYPE,
  USER_RELAY_NODE_TYPE,
} from '../../common/graphql/relay-id';
import { RelayNodeGql } from '../../common/graphql/relay-node';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '../../models/constants/user-role';
import { ApplicationGraphqlLoader } from '../modules/applications/graphql/application.graphql.loader';
import { ApprovalFlowsService } from '../modules/approval-flows/services/approval-flows.service';
import { toApprovalFlowGql } from '../modules/approval-flows/graphql/approval-flows.graphql.mapper';
import { AuditLogsService } from '../modules/audit-logs/services/audit-logs.service';
import { toAuditLogGql } from '../modules/audit-logs/graphql/audit-logs.graphql.mapper';
import { ExportJobsService } from '../modules/export-jobs/services/facades/export-jobs.service';
import { toExportJobGql } from '../modules/export-jobs/graphql/export-jobs.graphql.mapper';
import { FormDefinitionsService } from '../modules/form-definitions/services/facades/form-definitions.service';
import { toFormDefinitionGql } from '../modules/form-definitions/graphql/form-definitions.graphql.mapper';
import { GroupsService } from '../modules/groups/services/facades/groups.service';
import { toGroupGql } from '../modules/groups/graphql/groups.graphql.mapper';
import { UsersService } from '../modules/users/services/users.service';
import { toUserGql } from '../modules/users/graphql/users.graphql.mapper';

@Resolver(() => RelayNodeGql)
export class RelayNodeResolver {
  constructor(
    private readonly applicationLoader: ApplicationGraphqlLoader,
    private readonly approvalFlows: ApprovalFlowsService,
    private readonly auditLogs: AuditLogsService,
    private readonly exportJobs: ExportJobsService,
    private readonly formDefinitions: FormDefinitionsService,
    private readonly groups: GroupsService,
    private readonly users: UsersService,
  ) {}

  @Query(() => RelayNodeGql, {
    name: 'node',
    nullable: true,
    description: 'Relay global IDからNodeを返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async getNode(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<RelayNodeGql | null> {
    const decoded = fromRelayGlobalId(id);

    switch (decoded.type) {
      case APPLICATION_RELAY_NODE_TYPE:
        return this.applicationLoader.getApplication(actor, decoded.id);
      case APPROVAL_FLOW_RELAY_NODE_TYPE: {
        const row = await this.approvalFlows.getOneForActor(actor, decoded.id);
        return toApprovalFlowGql(this.approvalFlows.toDto(row));
      }
      case AUDIT_LOG_RELAY_NODE_TYPE: {
        if (!actor.roles.includes(UserRole.TENANT_ADMIN)) {
          return null;
        }
        const log = await this.auditLogs.getOneByTenant(
          actor.tenantId,
          decoded.id,
        );
        return log ? toAuditLogGql(log) : null;
      }
      case EXPORT_JOB_RELAY_NODE_TYPE:
        return toExportJobGql(await this.exportJobs.getOne(actor, decoded.id));
      case FORM_DEFINITION_RELAY_NODE_TYPE: {
        const row = await this.formDefinitions.getOneForActor(
          actor,
          decoded.id,
        );
        return toFormDefinitionGql(this.formDefinitions.toResponse(row));
      }
      case GROUP_RELAY_NODE_TYPE:
        return toGroupGql(await this.groups.getOneForActor(actor, decoded.id));
      case USER_RELAY_NODE_TYPE:
        return this.getUserNode(actor, decoded.id);
    }
  }

  private async getUserNode(
    actor: AuthUserPayload,
    userId: string,
  ): Promise<RelayNodeGql | null> {
    if (userId !== actor.id && !actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return null;
    }

    const user = await this.users.findByIdAndTenant(userId, actor.tenantId);
    return user ? toUserGql(user) : null;
  }
}
