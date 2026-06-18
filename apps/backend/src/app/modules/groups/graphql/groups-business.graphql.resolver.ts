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
import type { GroupMember } from '../../../../models/entities/group-member.entity';
import type { Group } from '../../../../models/entities/group.entity';
import {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupMemberRoleDto,
} from '../dto/groups.dto';
import { SpaceDashboardService } from '../services/dashboard/space-dashboard.service';
import { GroupsService } from '../services/facades/groups.service';

type GroupWithCurrentUserRole = Group & { currentUserRole?: string | null };

@Resolver()
export class GroupsBusinessGraphqlResolver {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly dashboardService: SpaceDashboardService,
  ) {}

  @Query(() => GraphQLJSON, { name: 'groups' })
  async list(@CurrentUser() actor: AuthUserPayload) {
    const groups = await this.groupsService.list(actor);
    return { groups: groups.map(toGroupSummary) };
  }

  @Query(() => GraphQLJSON, { name: 'spaceDashboard' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async dashboard(@CurrentUser() actor: AuthUserPayload) {
    return { spaces: await this.dashboardService.list(actor) };
  }

  @Mutation(() => GraphQLJSON, { name: 'createGroup' })
  @Roles(UserRole.TENANT_ADMIN)
  async create(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const group = await this.groupsService.create(
      toValidatedInput(CreateGroupDto, input),
      actor,
    );
    return toGroupSummary(group);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateGroup' })
  @Roles(UserRole.TENANT_ADMIN)
  async update(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const group = await this.groupsService.update(
      groupId,
      toValidatedInput(UpdateGroupDto, input),
      actor,
    );
    return toGroupSummary(group);
  }

  @Mutation(() => Boolean, { name: 'removeGroup' })
  @Roles(UserRole.TENANT_ADMIN)
  async remove(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.groupsService.remove(groupId, actor);
    return true;
  }

  @Query(() => GraphQLJSON, { name: 'groupMembers' })
  async listMembers(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const members = await this.groupsService.listMembers(groupId, actor);
    return { members: members.map(toMemberSummary) };
  }

  @Query(() => GraphQLJSON, { name: 'groupAvailableUsers' })
  async listAvailableUsers(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const users = await this.groupsService.listAvailableUsers(groupId, actor);
    return { users: users.map(toAvailableUserSummary) };
  }

  @Mutation(() => GraphQLJSON, { name: 'addGroupMember' })
  @Roles(UserRole.TENANT_ADMIN)
  async addMember(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const member = await this.groupsService.addMember(
      groupId,
      toValidatedInput(AddGroupMemberDto, input),
      actor,
    );
    return toMemberSummary(member);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateGroupMemberRole' })
  async updateMemberRole(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('userId', { type: () => ID }, ParseUUIDPipe) userId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const member = await this.groupsService.updateMemberRole(
      groupId,
      userId,
      toValidatedInput(UpdateGroupMemberRoleDto, input),
      actor,
    );
    return toMemberSummary(member);
  }

  @Mutation(() => Boolean, { name: 'leaveGroup' })
  async leave(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.groupsService.leave(groupId, actor);
    return true;
  }

  @Mutation(() => Boolean, { name: 'removeGroupMember' })
  async removeMember(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('userId', { type: () => ID }, ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.groupsService.removeMember(groupId, userId, actor);
    return true;
  }
}

function toGroupSummary(group: GroupWithCurrentUserRole) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdByUserId: group.createdByUserId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    currentUserRole: group.currentUserRole ?? null,
  };
}

function toMemberSummary(member: GroupMember) {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function toAvailableUserSummary(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
