import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TenantPlan, TenantStatus } from '../constants/tenant-enums';
import { UserRole } from '../constants/user-role';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokens: Repository<PasswordResetToken>,
  ) {}

  createTenantAdmin(params: {
    email: string;
    passwordHash: string;
    tenantName: string;
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const tenantRepo = manager.getRepository(Tenant);
      const userRepo = manager.getRepository(User);
      const tenant = tenantRepo.create({
        name: params.tenantName,
        plan: TenantPlan.FREE,
        status: TenantStatus.TRIAL,
      });
      await tenantRepo.save(tenant);
      const row = userRepo.create({
        tenantId: tenant.id,
        email: params.email,
        passwordHash: params.passwordHash,
        role: UserRole.TENANT_ADMIN,
        name: null,
        isActive: true,
      });
      return userRepo.save(row);
    });
  }

  createPasswordResetToken(params: {
    tenantId: string;
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.passwordResetTokens.save(
      this.passwordResetTokens.create({
        tenantId: params.tenantId,
        userId: params.userId,
        email: params.email,
        token: params.token,
        expiresAt: params.expiresAt,
        usedAt: null,
      }),
    );
  }

  findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    return this.passwordResetTokens.findOne({ where: { token } });
  }

  async updatePasswordAndMarkResetTokenUsed(params: {
    tokenRow: PasswordResetToken;
    passwordHash: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update(
        {
          id: params.tokenRow.userId,
          tenantId: params.tokenRow.tenantId,
          email: params.tokenRow.email,
        },
        { passwordHash: params.passwordHash },
      );
      await manager
        .getRepository(PasswordResetToken)
        .update({ id: params.tokenRow.id }, { usedAt: new Date() });
    });
  }
}
