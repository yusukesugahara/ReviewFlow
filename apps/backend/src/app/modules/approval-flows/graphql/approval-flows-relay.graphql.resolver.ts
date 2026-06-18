import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { connectionFromNodes } from '../../../../common/graphql/relay-pagination';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { ApprovalFlowsService } from '../services/approval-flows.service';
import { toApprovalFlowGql } from './approval-flows.graphql.mapper';
import {
  ApprovalFlowConnectionGql,
  ApprovalFlowGql,
} from './approval-flows.graphql.types';

@Resolver()
export class ApprovalFlowsRelayGraphqlResolver {
  constructor(private readonly approvalFlows: ApprovalFlowsService) {}

  @Query(() => ApprovalFlowConnectionGql, {
    name: 'approvalFlowsConnection',
    description: 'space内の承認フロー一覧をRelay Connection形式で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async listApprovalFlowsConnection(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApprovalFlowConnectionGql> {
    const nodes = (await this.approvalFlows.listByGroup(actor, groupId)).map(
      (row) => toApprovalFlowGql(this.approvalFlows.toDto(row)),
    );
    return connectionFromNodes({ after, first, nodes });
  }

  @Query(() => ApprovalFlowGql, {
    name: 'approvalFlowNode',
    description: '承認フローをRelay Node型で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async getApprovalFlowNode(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApprovalFlowGql> {
    const row = await this.approvalFlows.getOneForActor(actor, id);
    return toApprovalFlowGql(this.approvalFlows.toDto(row));
  }
}
