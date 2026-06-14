import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
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

  findAllByEmailAndTenant(email: string, tenantId: string): Promise<User[]> {
    return this.users.find({
      where: { email: email.toLowerCase(), tenantId },
    });
  }

  findActiveByEmail(email: string): Promise<User[]> {
    return this.users.find({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.users.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  async emailExistsForAnotherUser(
    email: string,
    currentUserId: string,
  ): Promise<boolean> {
    const count = await this.users.count({
      where: { email: email.toLowerCase(), id: Not(currentUserId) },
    });
    return count > 0;
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

  countByIdsInTenant(tenantId: string, ids: string[]): Promise<number> {
    if (!ids.length) {
      return Promise.resolve(0);
    }

    return this.users.count({
      where: { tenantId, id: In(ids) },
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

  save(user: User, manager?: EntityManager): Promise<User> {
    const repository = manager?.getRepository(User) ?? this.users;
    return repository.save(user);
  }
}
