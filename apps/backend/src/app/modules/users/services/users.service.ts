import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import {
  UserRole,
  type UserRoleValue,
} from '../../../../models/constants/user-role';
import { User } from '../../../../models/entities/user.entity';
import { UsersRepository } from '../../../../models/repositories/users.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../audit-logs/services/business-audit-log.service';

const ADMIN_CAPABLE_ROLES: UserRoleValue[] = [UserRole.TENANT_ADMIN];

/**
 * tenant ユーザーの検索、本人更新、管理者操作を扱う service。
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 全ユーザー数を取得する。
   * @returns ユーザー数
   */
  count(): Promise<number> {
    return this.usersRepository.count();
  }

  /**
   * ユーザーIDでユーザーを取得する。
   * @param id ユーザーID
   * @returns ユーザー
   */
  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /**
   * メールアドレスに一致する全ユーザーを取得する。
   * @param email メールアドレス
   * @returns ユーザー一覧
   */
  findAllByEmail(email: string): Promise<User[]> {
    return this.usersRepository.findAllByEmail(email);
  }

  /**
   * tenant 内でメールアドレスに一致するユーザーを取得する。
   * @param email メールアドレス
   * @param tenantId テナントID
   * @returns ユーザー一覧
   */
  findAllByEmailAndTenant(email: string, tenantId: string): Promise<User[]> {
    return this.usersRepository.findAllByEmailAndTenant(email, tenantId);
  }

  /**
   * メールアドレスに一致する有効ユーザーを取得する。
   * @param email メールアドレス
   * @returns 有効ユーザー一覧
   */
  findActiveByEmail(email: string): Promise<User[]> {
    return this.usersRepository.findActiveByEmail(email);
  }

  /**
   * メールアドレスが既に使われているかを返す。
   * @param email メールアドレス
   * @returns 使用済みか
   */
  emailExists(email: string): Promise<boolean> {
    return this.usersRepository.emailExists(email);
  }

  /**
   * 自分以外のユーザーがメールアドレスを使っているかを返す。
   * @param email メールアドレス
   * @param currentUserId 現在のユーザーID
   * @returns 自分以外で使用済みか
   */
  emailExistsForAnotherUser(
    email: string,
    currentUserId: string,
  ): Promise<boolean> {
    return this.usersRepository.emailExistsForAnotherUser(email, currentUserId);
  }

  /**
   * tenant とメールアドレスでユーザーを取得する。
   * @param tenantId テナントID
   * @param email メールアドレス
   * @returns ユーザー
   */
  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    return this.usersRepository.findByTenantAndEmail(tenantId, email);
  }

  /**
   * tenant scope 内でユーザーIDからユーザーを取得する。
   * @param id ユーザーID
   * @param tenantId テナントID
   * @returns ユーザー
   */
  findByIdAndTenant(id: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findByIdAndTenant(id, tenantId);
  }

  /**
   * tenant 内ユーザー一覧を取得する。
   * @param tenantId テナントID
   * @returns ユーザー一覧
   */
  findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.findAllByTenant(tenantId);
  }

  /**
   * tenant 内に存在する指定ユーザーID数を数える。
   * @param tenantId テナントID
   * @param ids ユーザーID一覧
   * @returns 存在件数
   */
  countByIdsInTenant(tenantId: string, ids: string[]): Promise<number> {
    return this.usersRepository.countByIdsInTenant(tenantId, ids);
  }

  /**
   * tenant 管理者数を数える。
   * @param tenantId テナントID
   * @returns tenant 管理者数
   */
  countTenantAdmins(tenantId: string): Promise<number> {
    return this.usersRepository.countTenantAdmins(tenantId);
  }

  /**
   * tenant 内ユーザーのロールを変更する。最後の tenant 管理者は降格できない。
   * @param tenantId テナントID
   * @param targetUserId 対象ユーザーID
   * @param nextRole 変更後ロール
   * @param actor ログインユーザー
   * @returns 更新されたユーザー
   */
  async updateRoleInTenant(
    tenantId: string,
    targetUserId: string,
    nextRole: UserRoleValue,
    actor: AuthUserPayload,
  ): Promise<User> {
    if (targetUserId === actor.id) {
      throw clientError(ClientErrorCodes.USER_ROLE_UPDATE_SELF_FORBIDDEN);
    }

    const target = await this.findByIdAndTenant(targetUserId, tenantId);
    if (!target) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    if (
      ADMIN_CAPABLE_ROLES.includes(target.role) &&
      !ADMIN_CAPABLE_ROLES.includes(nextRole)
    ) {
      const admins = await this.countTenantAdmins(tenantId);
      if (admins <= 1) {
        throw clientError(ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED);
      }
    }

    const previousRole = target.role;
    target.role = nextRole;
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.usersRepository.save(target, manager);
      await this.auditLogs.recordUserEvent(
        {
          actionType: BusinessAuditAction.USER_ROLE_CHANGED,
          actor,
          target: saved,
          roleFrom: previousRole,
          roleTo: saved.role,
        },
        manager,
      );
      return saved;
    });
  }

  /**
   * ログインユーザー自身のプロフィールを更新する。
   * @param actor ログインユーザー
   * @param input 更新入力
   * @returns 更新されたユーザー
   */
  async updateOwnProfile(
    actor: Pick<AuthUserPayload, 'id' | 'email' | 'tenantId'>,
    input: { name?: string },
  ): Promise<User> {
    const target = await this.findByIdAndTenant(actor.id, actor.tenantId);
    if (!target) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    const nextName = normalizeNullableText(input.name);
    const previousName = target.name;
    if (previousName === nextName) {
      return target;
    }

    target.name = nextName;
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.usersRepository.save(target, manager);
      await this.auditLogs.recordUserEvent(
        {
          actionType: BusinessAuditAction.USER_PROFILE_UPDATED,
          actor,
          target: saved,
          metadataJson: {
            userNameFrom: previousName,
            userNameTo: saved.name,
          },
        },
        manager,
      );
      return saved;
    });
  }

  /**
   * ログインユーザー自身のパスワードを更新する。
   * @param actor ログインユーザー
   * @param input パスワード更新入力
   * @returns 更新されたユーザー
   */
  async updateOwnPassword(
    actor: Pick<AuthUserPayload, 'id' | 'email' | 'tenantId'>,
    input: { currentPassword: string; newPassword: string },
  ): Promise<User> {
    const target = await this.findByIdAndTenant(actor.id, actor.tenantId);
    if (!target) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    const currentPasswordMatches = await bcrypt.compare(
      input.currentPassword,
      target.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    target.passwordHash = await bcrypt.hash(input.newPassword, 10);
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.usersRepository.save(target, manager);
      await this.auditLogs.recordUserEvent(
        {
          actionType: BusinessAuditAction.USER_PASSWORD_CHANGED,
          actor,
          target: saved,
          metadataJson: { passwordChanged: true },
        },
        manager,
      );
      return saved;
    });
  }

  /**
   * tenant 内ユーザーを無効化する。最後の tenant 管理者は無効化できない。
   * @param tenantId テナントID
   * @param targetUserId 対象ユーザーID
   * @param actor ログインユーザー
   */
  async deactivateInTenant(
    tenantId: string,
    targetUserId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    if (targetUserId === actor.id) {
      throw clientError(ClientErrorCodes.USER_DELETE_SELF_FORBIDDEN);
    }

    const target = await this.findByIdAndTenant(targetUserId, tenantId);
    if (!target) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    if (ADMIN_CAPABLE_ROLES.includes(target.role) && target.isActive) {
      const admins = await this.countTenantAdmins(tenantId);
      if (admins <= 1) {
        throw clientError(ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED);
      }
    }

    target.isActive = false;
    await this.dataSource.transaction(async (manager) => {
      await this.usersRepository.save(target, manager);
      await this.auditLogs.recordUserEvent(
        {
          actionType: BusinessAuditAction.USER_DEACTIVATED,
          actor,
          target,
          metadataJson: { isActiveFrom: true, isActiveTo: false },
        },
        manager,
      );
    });
  }

  /**
   * tenant 内ユーザーを復元する。
   * @param tenantId テナントID
   * @param targetUserId 対象ユーザーID
   * @param actor ログインユーザー
   * @returns 復元されたユーザー
   */
  async restoreInTenant(
    tenantId: string,
    targetUserId: string,
    actor: AuthUserPayload,
  ): Promise<User> {
    const target = await this.findByIdAndTenant(targetUserId, tenantId);
    if (!target) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    target.isActive = true;
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.usersRepository.save(target, manager);
      await this.auditLogs.recordUserEvent(
        {
          actionType: BusinessAuditAction.USER_RESTORED,
          actor,
          target: saved,
          metadataJson: { isActiveFrom: false, isActiveTo: true },
        },
        manager,
      );
      return saved;
    });
  }
}

/**
 * 任意テキストを null 許容の保存値へ正規化する。
 * @param value 入力値
 * @returns 正規化済みテキスト
 */
function normalizeNullableText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
