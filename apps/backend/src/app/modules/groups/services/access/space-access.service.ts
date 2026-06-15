import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';

/**
 * スペース（DB 上の group）に対する利用・管理権限を検証する service。
 *
 * tenant 境界の確認と group member role の確認をまとめ、各 module に判定を重複させない。
 */
@Injectable()
export class SpaceAccessService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  /**
   * group が tenant scope 内に存在するか検証する。
   * @param tenantId テナントID
   * @param groupId スペースID
   */
  async assertGroupInTenant(tenantId: string, groupId: string): Promise<void> {
    const count = await this.groupsRepository.countGroupInTenant(
      tenantId,
      groupId,
    );
    if (count === 0) {
      throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
    }
  }

  /**
   * actor が space を利用できるか検証する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   */
  async assertCanUseGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<void> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    const member = await this.groupsRepository.findMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    if (!member) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  /**
   * actor が space を管理できるか検証する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   */
  async assertCanManageGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<void> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    const member = await this.groupsRepository.findAdminMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    if (!member) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  /**
   * actor が space を管理できるかを boolean で返す。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @returns 管理できるか
   */
  async actorCanManageGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<boolean> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return true;
    }
    const member = await this.groupsRepository.findAdminMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    return !!member;
  }
}
