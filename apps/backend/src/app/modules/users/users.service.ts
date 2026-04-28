import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import {
  UserRole,
  type UserRoleValue,
} from '../../../models/constants/user-role';
import { User } from '../../../models/entities/user.entity';

const ADMIN_CAPABLE_ROLES: UserRoleValue[] = [
  UserRole.PLATFORM_ADMIN,
  UserRole.TENANT_ADMIN,
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  count(): Promise<number> {
    return this.users.count();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findAllByEmail(email: string): Promise<User[]> {
    return this.users.find({
      where: { email: email.toLowerCase() },
    });
  }

  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    return this.users.findOne({
      where: { tenantId, email: email.toLowerCase() },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<User | null> {
    return this.users.findOne({ where: { id, tenantId } });
  }

  findAllByTenant(tenantId: string): Promise<User[]> {
    return this.users.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  findAllByIdsInTenant(tenantId: string, ids: string[]): Promise<User[]> {
    if (!ids.length) {
      return Promise.resolve([]);
    }
    return this.users.find({
      where: { tenantId, id: In(ids) },
      order: { createdAt: 'ASC' },
    });
  }

  countTenantAdmins(tenantId: string): Promise<number> {
    return this.users.count({
      where: {
        tenantId,
        role: In(ADMIN_CAPABLE_ROLES),
        isActive: true,
      },
    });
  }

  async updateRoleInTenant(
    tenantId: string,
    targetUserId: string,
    nextRole: UserRoleValue,
    actorUserId: string,
  ): Promise<User> {
    if (targetUserId === actorUserId) {
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

    target.role = nextRole;
    return this.users.save(target);
  }
}
