import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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
import { TransactionService } from '../../../transaction';

const ADMIN_CAPABLE_ROLES: UserRoleValue[] = [UserRole.TENANT_ADMIN];

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly transactions: TransactionService,
  ) {}

  count(): Promise<number> {
    return this.usersRepository.count();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  findAllByEmail(email: string): Promise<User[]> {
    return this.usersRepository.findAllByEmail(email);
  }

  findAllByEmailAndTenant(email: string, tenantId: string): Promise<User[]> {
    return this.usersRepository.findAllByEmailAndTenant(email, tenantId);
  }

  findActiveByEmail(email: string): Promise<User[]> {
    return this.usersRepository.findActiveByEmail(email);
  }

  emailExists(email: string): Promise<boolean> {
    return this.usersRepository.emailExists(email);
  }

  emailExistsForAnotherUser(
    email: string,
    currentUserId: string,
  ): Promise<boolean> {
    return this.usersRepository.emailExistsForAnotherUser(email, currentUserId);
  }

  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    return this.usersRepository.findByTenantAndEmail(tenantId, email);
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findByIdAndTenant(id, tenantId);
  }

  findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.findAllByTenant(tenantId);
  }

  countByIdsInTenant(tenantId: string, ids: string[]): Promise<number> {
    return this.usersRepository.countByIdsInTenant(tenantId, ids);
  }

  countTenantAdmins(tenantId: string): Promise<number> {
    return this.usersRepository.countTenantAdmins(tenantId);
  }

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
    return this.transactions.run(async (manager) => {
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
    return this.transactions.run(async (manager) => {
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
    return this.transactions.run(async (manager) => {
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
    await this.transactions.run(async (manager) => {
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
    return this.transactions.run(async (manager) => {
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

function normalizeNullableText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
