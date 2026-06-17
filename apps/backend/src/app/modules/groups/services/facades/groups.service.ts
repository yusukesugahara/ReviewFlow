import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
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

/**
 * space CRUD と space member 操作の facade。
 */
@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly groupMembers: GroupMembersService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * actor が閲覧できる space 一覧を取得する。
   * @param actor ログインユーザー
   * @returns space 一覧
   */
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

  /**
   * tenant 内に space を作成し、初期管理者を登録する。
   * @param dto space 作成DTO
   * @param actor ログインユーザー
   * @returns 作成された space
   */
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
    const tenantUserCount = await this.usersService.countByIdsInTenant(
      actor.tenantId,
      adminUserIds,
    );
    if (tenantUserCount !== adminUserIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    return this.dataSource.transaction(async (manager) => {
      const group = await this.groupsRepository.createGroupWithAdmins(
        {
          tenantId: actor.tenantId,
          name,
          description: dto.description ?? null,
          createdByUserId: actor.id,
          adminUserIds,
        },
        manager,
      );

      await this.auditLogs.recordSpaceEvent(
        {
          actionType: BusinessAuditAction.SPACE_CREATED,
          actor,
          group,
          metadataJson: {
            adminUserIds,
          },
        },
        manager,
      );

      return group;
    });
  }

  /**
   * space の名前と説明文を更新する。
   * @param groupId スペースID
   * @param dto space 更新DTO
   * @param actor ログインユーザー
   * @returns 更新された space
   */
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
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.groupsRepository.saveGroup(group, manager);

      await this.auditLogs.recordSpaceEvent(
        {
          actionType: BusinessAuditAction.SPACE_UPDATED,
          actor,
          group: saved,
          metadataJson: {
            nameFrom: before.name,
            nameTo: saved.name,
            descriptionFrom: before.description,
            descriptionTo: saved.description,
          },
        },
        manager,
      );

      return saved;
    });
  }

  /**
   * tenant 内の space を削除する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   */
  async remove(groupId: string, actor: AuthUserPayload): Promise<void> {
    const group = await this.findGroupInTenant(groupId, actor.tenantId);
    await this.dataSource.transaction(async (manager) => {
      await this.auditLogs.recordSpaceEvent(
        {
          actionType: BusinessAuditAction.SPACE_DELETED,
          actor,
          group,
          metadataJson: {
            groupId: group.id,
          },
        },
        manager,
      );
      await this.groupsRepository.deleteGroup(group.id, manager);
    });
  }

  /**
   * space メンバー一覧を取得する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   * @returns space メンバー一覧
   */
  async listMembers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<GroupMember[]> {
    return this.groupMembers.listMembers(groupId, actor);
  }

  /**
   * space に追加可能な tenant ユーザー一覧を取得する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   * @returns 追加可能ユーザー一覧
   */
  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    return this.groupMembers.listAvailableUsers(groupId, actor);
  }

  /**
   * tenant ユーザーを space メンバーに追加する。
   * @param groupId スペースID
   * @param dto メンバー追加DTO
   * @param actor ログインユーザー
   * @returns 作成されたメンバー
   */
  async addMember(
    groupId: string,
    dto: AddGroupMemberDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    return this.groupMembers.addMember(groupId, dto, actor);
  }

  /**
   * space メンバーの権限を変更する。
   * @param groupId スペースID
   * @param userId ユーザーID
   * @param dto メンバー権限更新DTO
   * @param actor ログインユーザー
   * @returns 更新されたメンバー
   */
  async updateMemberRole(
    groupId: string,
    userId: string,
    dto: UpdateGroupMemberRoleDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    return this.groupMembers.updateMemberRole(groupId, userId, dto, actor);
  }

  /**
   * space メンバーを削除する。
   * @param groupId スペースID
   * @param userId ユーザーID
   * @param actor ログインユーザー
   */
  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.groupMembers.removeMember(groupId, userId, actor);
  }

  /**
   * actor 自身が space から退出する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   */
  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.groupMembers.leave(groupId, actor);
  }

  /**
   * tenant scope 内の space を読み込む。
   * @param groupId スペースID
   * @param tenantId テナントID
   * @returns space
   */
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

  /**
   * actor が tenant 管理者かを返す。
   * @param actor ログインユーザー
   * @returns tenant 管理者か
   */
  private isSystemAdmin(actor: AuthUserPayload): boolean {
    return actor.roles.includes(UserRole.TENANT_ADMIN);
  }
}

/**
 * 任意テキストを null 許容の保存値へ正規化する。
 * @param value 入力値
 * @returns 正規化済みテキスト
 */
function normalizeOptionalText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
