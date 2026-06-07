import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../constants/user-role';
import type { UserRoleValue } from '../constants/user-role';
import { User } from '../entities/user.entity';

const ADMIN_CAPABLE_ROLES: UserRoleValue[] = [UserRole.TENANT_ADMIN];

@Injectable()
export class UsersRepository {
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

  save(user: User): Promise<User> {
    return this.users.save(user);
  }
}
