import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import {
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
} from '../dto/approval-flows.dto';
import { ApprovalFlowsService } from '../services/approval-flows.service';

@Resolver()
export class ApprovalFlowsBusinessGraphqlResolver {
  constructor(private readonly approvalFlows: ApprovalFlowsService) {}

  @Query(() => GraphQLJSON, { name: 'approvalFlows' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async list(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const rows = await this.approvalFlows.listByGroup(actor, groupId);
    return { flows: rows.map((row) => this.approvalFlows.toDto(row)) };
  }

  @Mutation(() => GraphQLJSON, { name: 'createApprovalFlow' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async create(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.approvalFlows.create(
      actor,
      toValidatedInput(CreateApprovalFlowDto, input),
    );
    return this.approvalFlows.toDto(row);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateApprovalFlow' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async update(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.approvalFlows.update(
      actor,
      id,
      toValidatedInput(UpdateApprovalFlowDto, input),
    );
    return this.approvalFlows.toDto(row);
  }
}
