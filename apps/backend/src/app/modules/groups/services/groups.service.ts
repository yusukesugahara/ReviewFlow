import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
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
import { GroupMembersService } from './group-members.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly groupMembers: GroupMembersService,
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
    return this.groupMembers.listMembers(groupId, actor);
  }

  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    return this.groupMembers.listAvailableUsers(groupId, actor);
  }

  async addMember(
    groupId: string,
    dto: AddGroupMemberDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    return this.groupMembers.addMember(groupId, dto, actor);
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    dto: UpdateGroupMemberRoleDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    return this.groupMembers.updateMemberRole(groupId, userId, dto, actor);
  }

  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.groupMembers.removeMember(groupId, userId, actor);
  }

  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.groupMembers.leave(groupId, actor);
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

  private isSystemAdmin(actor: AuthUserPayload): boolean {
    return actor.roles.includes(UserRole.TENANT_ADMIN);
  }
}
