import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../../models/constants/group-member-role';
import { UserRole } from '../../../../models/constants/user-role';
import { GroupMember } from '../../../../models/entities/group-member.entity';
import { Group } from '../../../../models/entities/group.entity';
import { User } from '../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../models/repositories/groups.repository';
import { UsersService } from '../../users/services/users.service';
import type {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupMemberRoleDto,
} from '../dto/groups.dto';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(actor: AuthUserPayload): Promise<Group[]> {
    if (this.isSystemAdmin(actor)) {
      const [groups, memberships] = await Promise.all([
        this.groupsRepository.findGroupsByTenant(actor.tenantId),
        this.groupsRepository.findMembershipsByTenantAndUser(
          actor.tenantId,
          actor.id,
        ),
      ]);
      const roleByGroupId = new Map(
        memberships.map((member) => [member.groupId, member.role]),
      );
      return groups.map((group) =>
        Object.assign(group, {
          currentUserRole: roleByGroupId.get(group.id) ?? null,
        }),
      );
    }

    const rows =
      await this.groupsRepository.findMembershipsWithGroupsByTenantAndUser(
        actor.tenantId,
        actor.id,
      );
    return rows.map((row) =>
      Object.assign(row.group, { currentUserRole: row.role }),
    );
  }

  async create(dto: CreateGroupDto, actor: AuthUserPayload): Promise<Group> {
    const name = dto.name.trim();
    if (!name.length) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const exists = await this.groupsRepository.findGroupByTenantAndName(
      actor.tenantId,
      name,
    );
    if (exists) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const adminUserIds = Array.from(new Set(dto.adminUserIds));
    const users = await this.usersService.findAllByIdsInTenant(
      actor.tenantId,
      adminUserIds,
    );
    if (users.length !== adminUserIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    return this.groupsRepository.createGroupWithAdmins({
      tenantId: actor.tenantId,
      name,
      description: dto.description ?? null,
      createdByUserId: actor.id,
      adminUserIds,
    });
  }

  async remove(groupId: string, actor: AuthUserPayload): Promise<void> {
    const group = await this.findGroupInTenant(groupId, actor.tenantId);
    await this.groupsRepository.deleteGroup(group.id);
  }

  async listMembers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<GroupMember[]> {
    await this.assertCanManageGroup(groupId, actor);
    return this.groupsRepository.findMembersWithUsers(actor.tenantId, groupId);
  }

  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    await this.assertCanManageGroup(groupId, actor);
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
    return saved;
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    dto: UpdateGroupMemberRoleDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    await this.assertCanManageGroup(groupId, actor);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (
      member.role === GroupMemberRole.ADMIN &&
      dto.role !== GroupMemberRole.ADMIN
    ) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    member.role = dto.role;
    return this.groupsRepository.saveMember(member);
  }

  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.assertCanManageGroup(groupId, actor);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    await this.groupsRepository.deleteMember(member.id);
  }

  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);

    const member = await this.findMember(groupId, actor.id, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, actor.id);
    }

    await this.groupsRepository.deleteMember(member.id);
  }

  private async findGroupInTenant(
    groupId: string,
    tenantId: string,
  ): Promise<Group> {
    const group = await this.groupsRepository.findGroupByIdInTenant(
      groupId,
      tenantId,
    );
    if (!group) {
      throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
    }
    return group;
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

  private async assertCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);
    if (this.isSystemAdmin(actor)) {
      return;
    }

    const actorMember = await this.groupsRepository.findAdminMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    if (!actorMember) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  private async assertTenantAdminCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);
    if (!this.isSystemAdmin(actor)) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
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

  private isSystemAdmin(actor: AuthUserPayload): boolean {
    return actor.roles.includes(UserRole.TENANT_ADMIN);
  }
}
