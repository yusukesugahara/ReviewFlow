import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupMember } from '../../../../../models/entities/group-member.entity';
import { Group } from '../../../../../models/entities/group.entity';
import { User } from '../../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { UsersService } from '../../../users/services/users.service';
import type {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupMemberRoleDto,
} from '../../dto/groups.dto';
import { GroupMembersService } from '../members/group-members.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly groupMembers: GroupMembersService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async list(actor: AuthUserPayload): Promise<Group[]> {
    if (this.isSystemAdmin(actor)) {
      return this.groupsRepository.findGroupsByTenantWithCurrentUserRole(
        actor.tenantId,
        actor.id,
      );
    }

    return this.groupsRepository.findGroupsByMembershipForUser(
      actor.tenantId,
      actor.id,
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

    const group = await this.groupsRepository.createGroupWithAdmins({
      tenantId: actor.tenantId,
      name,
      description: dto.description ?? null,
      createdByUserId: actor.id,
      adminUserIds,
    });

    await this.auditLogs.recordSpaceEvent({
      actionType: BusinessAuditAction.SPACE_CREATED,
      actor,
      group,
      metadataJson: {
        adminUserIds,
      },
    });

    return group;
  }

  async update(
    groupId: string,
    dto: UpdateGroupDto,
    actor: AuthUserPayload,
  ): Promise<Group> {
    const group = await this.findGroupInTenant(groupId, actor.tenantId);
    const name = dto.name.trim();
    if (!name.length) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const existing = await this.groupsRepository.findGroupByTenantAndName(
      actor.tenantId,
      name,
    );
    if (existing && existing.id !== group.id) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const before = {
      name: group.name,
      description: group.description,
    };
    const description = normalizeOptionalText(dto.description);
    if (before.name === name && before.description === description) {
      return group;
    }

    group.name = name;
    group.description = description;
    const saved = await this.groupsRepository.saveGroup(group);

    await this.auditLogs.recordSpaceEvent({
      actionType: BusinessAuditAction.SPACE_UPDATED,
      actor,
      group: saved,
      metadataJson: {
        nameFrom: before.name,
        nameTo: saved.name,
        descriptionFrom: before.description,
        descriptionTo: saved.description,
      },
    });

    return saved;
  }

  async remove(groupId: string, actor: AuthUserPayload): Promise<void> {
    const group = await this.findGroupInTenant(groupId, actor.tenantId);
    await this.auditLogs.recordSpaceEvent({
      actionType: BusinessAuditAction.SPACE_DELETED,
      actor,
      group,
      metadataJson: {
        groupId: group.id,
      },
    });
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

function normalizeOptionalText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
