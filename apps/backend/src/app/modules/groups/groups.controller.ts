import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthApi,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
} from '../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { GroupMember } from '../../../models/entities/group-member.entity';
import type { Group } from '../../../models/entities/group.entity';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  AddGroupMemberDto,
  CreateGroupDto,
  GroupAvailableUsersResponseDto,
  GroupMemberSummaryDto,
  GroupMembersListResponseDto,
  GroupsListResponseDto,
  GroupSummaryDto,
  UpdateGroupMemberRoleDto,
} from './groups.dto';
import { GroupsService } from './groups.service';

type GroupWithCurrentUserRole = Group & { currentUserRole?: string | null };

function toGroupSummary(group: GroupWithCurrentUserRole): GroupSummaryDto {
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

function toMemberSummary(member: GroupMember): GroupMemberSummaryDto {
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

@ApiTags('spaces')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'スペース一覧（tenant_admin は全件、通常ユーザーは参加中のみ）',
  })
  @ApiSuccessResponse(GroupsListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupsListResponseDto>> {
    const groups = await this.groupsService.list(actor);
    return successResponse({ groups: groups.map(toGroupSummary) });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'スペース作成（tenant_admin）' })
  @ApiSuccessResponseCreated(GroupSummaryDto)
  async create(
    @Body() dto: CreateGroupDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupSummaryDto>> {
    const group = await this.groupsService.create(dto, actor);
    return successResponse(toGroupSummary(group));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Delete(':groupId')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'スペース削除（tenant_admin）' })
  async remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<void> {
    await this.groupsService.remove(groupId, actor);
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':groupId/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'スペースメンバー一覧（tenant_admin / space admin）',
  })
  @ApiSuccessResponse(GroupMembersListResponseDto)
  async listMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupMembersListResponseDto>> {
    const members = await this.groupsService.listMembers(groupId, actor);
    return successResponse({ members: members.map(toMemberSummary) });
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':groupId/available-users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'スペース追加候補ユーザー一覧（tenant_admin / space admin）',
  })
  @ApiSuccessResponse(GroupAvailableUsersResponseDto)
  async listAvailableUsers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupAvailableUsersResponseDto>> {
    const users = await this.groupsService.listAvailableUsers(groupId, actor);
    return successResponse({ users: users.map(toAvailableUserSummary) });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':groupId/members')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'スペースへユーザー追加（tenant_admin）',
  })
  @ApiSuccessResponseCreated(GroupMemberSummaryDto)
  async addMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupMemberSummaryDto>> {
    const member = await this.groupsService.addMember(groupId, dto, actor);
    return successResponse(toMemberSummary(member));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Patch(':groupId/members/:userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'スペース管理者/ユーザ設定（tenant_admin / space admin）',
  })
  @ApiSuccessResponse(GroupMemberSummaryDto)
  async updateMemberRole(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateGroupMemberRoleDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<GroupMemberSummaryDto>> {
    const member = await this.groupsService.updateMemberRole(
      groupId,
      userId,
      dto,
      actor,
    );
    return successResponse(toMemberSummary(member));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Delete(':groupId/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'スペースから退出（参加中ユーザー）',
  })
  async leave(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<void> {
    await this.groupsService.leave(groupId, actor);
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'スペースメンバー削除（tenant_admin / space admin）',
  })
  async removeMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<void> {
    await this.groupsService.removeMember(groupId, userId, actor);
  }
}
