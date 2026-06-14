import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../../../models/constants/group-member-role';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupMember } from '../../../../../models/entities/group-member.entity';
import { User } from '../../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { UsersService } from '../../../users/services/users.service';
import type {
  AddGroupMemberDto,
  UpdateGroupMemberRoleDto,
} from '../../dto/groups.dto';
import { SpaceAccessService } from '../access/space-access.service';

@Injectable()
export class GroupMembersService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly spaceAccess: SpaceAccessService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async listMembers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<GroupMember[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.groupsRepository.findMembersWithUsers(actor.tenantId, groupId);
  }

  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    const [users, members] = await Promise.all([
      this.usersService.findAllByTenant(actor.tenantId),
      this.groupsRepository.findMembershipsByGroup(actor.tenantId, groupId),
    ]);
    const memberUserIds = new Set(members.map((member) => member.userId));
    return users.filter((user) => !memberUserIds.has(user.id));
  }

  async addMember(
    groupId: string,
    dto: AddGroupMemberDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    await this.assertTenantAdminCanManageGroup(groupId, actor);

    const user = await this.usersService.findByIdAndTenant(
      dto.userId,
      actor.tenantId,
    );
    if (!user) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    const exists = await this.groupsRepository.findMember(
      actor.tenantId,
      groupId,
      dto.userId,
    );
    if (exists) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_EXISTS);
    }

    const saved = await this.groupsRepository.createMember({
      tenantId: actor.tenantId,
      groupId,
      userId: dto.userId,
      role: dto.role,
      invitedByUserId: actor.id,
    });

    saved.user = user;
    await this.auditLogs.recordSpaceMemberEvent({
      actionType: BusinessAuditAction.SPACE_MEMBER_ADDED,
      actor,
      member: saved,
      groupRoleTo: saved.role,
    });

    return saved;
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    dto: UpdateGroupMemberRoleDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (
      member.role === GroupMemberRole.ADMIN &&
      dto.role !== GroupMemberRole.ADMIN
    ) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    const previousRole = member.role;
    member.role = dto.role;
    const saved = await this.groupsRepository.saveMember(member);

    await this.auditLogs.recordSpaceMemberEvent({
      actionType: BusinessAuditAction.SPACE_MEMBER_ROLE_CHANGED,
      actor,
      member: saved,
      groupRoleFrom: previousRole,
      groupRoleTo: saved.role,
    });

    return saved;
  }

  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    await this.groupsRepository.deleteMember(member.id);
    await this.auditLogs.recordSpaceMemberEvent({
      actionType: BusinessAuditAction.SPACE_MEMBER_REMOVED,
      actor,
      member,
      groupRoleFrom: member.role,
    });
  }

  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.spaceAccess.assertGroupInTenant(actor.tenantId, groupId);

    const member = await this.findMember(groupId, actor.id, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, actor.id);
    }

    await this.groupsRepository.deleteMember(member.id);
    await this.auditLogs.recordSpaceMemberEvent({
      actionType: BusinessAuditAction.SPACE_MEMBER_LEFT,
      actor,
      member,
      groupRoleFrom: member.role,
    });
  }

  private async assertTenantAdminCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.spaceAccess.assertGroupInTenant(actor.tenantId, groupId);
    if (!actor.roles.includes(UserRole.TENANT_ADMIN)) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  private async findMember(
    groupId: string,
    userId: string,
    tenantId: string,
  ): Promise<GroupMember> {
    const member = await this.groupsRepository.findMember(
      tenantId,
      groupId,
      userId,
    );
    if (!member) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }
    return member;
  }

  private async assertAnotherAdminRemains(
    groupId: string,
    tenantId: string,
    exceptUserId: string,
  ): Promise<void> {
    const admins = await this.groupsRepository.findAdmins(tenantId, groupId);
    const another = admins.some((admin) => admin.userId !== exceptUserId);
    if (!another) {
      throw clientError(ClientErrorCodes.LAST_GROUP_ADMIN_PROTECTED);
    }
  }
}
