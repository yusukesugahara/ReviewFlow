import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
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

/**
 * space メンバーの一覧・追加・権限変更・削除・退出を扱う service。
 */
@Injectable()
export class GroupMembersService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly usersService: UsersService,
    private readonly spaceAccess: SpaceAccessService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * space 管理者向けにメンバー一覧を取得する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   * @returns space メンバー一覧
   */
  async listMembers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<GroupMember[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.groupsRepository.findMembersWithUsers(actor.tenantId, groupId);
  }

  /**
   * space に未参加の tenant ユーザー一覧を取得する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   * @returns 追加可能ユーザー一覧
   */
  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.groupsRepository.findAvailableUsersForGroup(
      actor.tenantId,
      groupId,
    );
  }

  /**
   * tenant 管理者が既存 tenant ユーザーを space に追加する。
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

    return this.dataSource.transaction(async (manager) => {
      const saved = await this.groupsRepository.createMember(
        {
          tenantId: actor.tenantId,
          groupId,
          userId: dto.userId,
          role: dto.role,
          invitedByUserId: actor.id,
        },
        manager,
      );

      saved.user = user;
      await this.auditLogs.recordSpaceMemberEvent(
        {
          actionType: BusinessAuditAction.SPACE_MEMBER_ADDED,
          actor,
          member: saved,
          groupRoleTo: saved.role,
        },
        manager,
      );

      return saved;
    });
  }

  /**
   * space メンバーの権限を変更する。最後の space 管理者は降格できない。
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
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.groupsRepository.saveMember(member, manager);

      await this.auditLogs.recordSpaceMemberEvent(
        {
          actionType: BusinessAuditAction.SPACE_MEMBER_ROLE_CHANGED,
          actor,
          member: saved,
          groupRoleFrom: previousRole,
          groupRoleTo: saved.role,
        },
        manager,
      );

      return saved;
    });
  }

  /**
   * space メンバーを削除する。最後の space 管理者は削除できない。
   * @param groupId スペースID
   * @param userId ユーザーID
   * @param actor ログインユーザー
   */
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

    await this.dataSource.transaction(async (manager) => {
      await this.groupsRepository.deleteMember(member.id, manager);
      await this.auditLogs.recordSpaceMemberEvent(
        {
          actionType: BusinessAuditAction.SPACE_MEMBER_REMOVED,
          actor,
          member,
          groupRoleFrom: member.role,
        },
        manager,
      );
    });
  }

  /**
   * actor 自身を space から退出させる。最後の space 管理者は退出できない。
   * @param groupId スペースID
   * @param actor ログインユーザー
   */
  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.spaceAccess.assertGroupInTenant(actor.tenantId, groupId);

    const member = await this.findMember(groupId, actor.id, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, actor.id);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.groupsRepository.deleteMember(member.id, manager);
      await this.auditLogs.recordSpaceMemberEvent(
        {
          actionType: BusinessAuditAction.SPACE_MEMBER_LEFT,
          actor,
          member,
          groupRoleFrom: member.role,
        },
        manager,
      );
    });
  }

  /**
   * tenant 管理者だけが既存ユーザーを space に直接追加できることを検証する。
   * @param groupId スペースID
   * @param actor ログインユーザー
   */
  private async assertTenantAdminCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.spaceAccess.assertGroupInTenant(actor.tenantId, groupId);
    if (!actor.roles.includes(UserRole.TENANT_ADMIN)) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  /**
   * tenant / space scope 内のメンバーを取得する。
   * @param groupId スペースID
   * @param userId ユーザーID
   * @param tenantId テナントID
   * @returns space メンバー
   */
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

  /**
   * 対象ユーザー以外に space 管理者が残ることを検証する。
   * @param groupId スペースID
   * @param tenantId テナントID
   * @param exceptUserId 除外するユーザーID
   */
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
