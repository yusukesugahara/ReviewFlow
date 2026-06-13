import { Injectable } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditLogs: BusinessAuditLogService,
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

  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    return this.usersRepository.findByTenantAndEmail(tenantId, email);
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findByIdAndTenant(id, tenantId);
  }

  findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.findAllByTenant(tenantId);
  }

  findAllByIdsInTenant(tenantId: string, ids: string[]): Promise<User[]> {
    return this.usersRepository.findAllByIdsInTenant(tenantId, ids);
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
    const saved = await this.usersRepository.save(target);
    await this.auditLogs.recordUserEvent({
      actionType: BusinessAuditAction.USER_ROLE_CHANGED,
      actor,
      target: saved,
      roleFrom: previousRole,
      roleTo: saved.role,
    });
    return saved;
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
    await this.usersRepository.save(target);
    await this.auditLogs.recordUserEvent({
      actionType: BusinessAuditAction.USER_DEACTIVATED,
      actor,
      target,
      metadataJson: { isActiveFrom: true, isActiveTo: false },
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
    const saved = await this.usersRepository.save(target);
    await this.auditLogs.recordUserEvent({
      actionType: BusinessAuditAction.USER_RESTORED,
      actor,
      target: saved,
      metadataJson: { isActiveFrom: false, isActiveTo: true },
    });
    return saved;
  }
}
