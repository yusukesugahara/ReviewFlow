import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TenantPlan, TenantStatus } from '../constants/tenant-enums';
import { UserRole } from '../constants/user-role';
import { EmailChangeToken } from '../entities/email-change-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EmailChangeToken)
    private readonly emailChangeTokens: Repository<EmailChangeToken>,
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

  async createEmailChangeToken(params: {
    tenantId: string;
    userId: string;
    currentEmail: string;
    newEmail: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailChangeToken> {
    await this.emailChangeTokens.update(
      { userId: params.userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return this.emailChangeTokens.save(
      this.emailChangeTokens.create({
        tenantId: params.tenantId,
        userId: params.userId,
        currentEmail: params.currentEmail,
        newEmail: params.newEmail,
        token: params.token,
        expiresAt: params.expiresAt,
        usedAt: null,
      }),
    );
  }

  findEmailChangeToken(token: string): Promise<EmailChangeToken | null> {
    return this.emailChangeTokens.findOne({ where: { token } });
  }

  async updateEmailAndMarkEmailChangeTokenUsed(params: {
    tokenRow: EmailChangeToken;
    email: string;
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const tokenRepo = manager.getRepository(EmailChangeToken);
      const user = await userRepo.findOne({
        where: {
          id: params.tokenRow.userId,
          tenantId: params.tokenRow.tenantId,
        },
      });
      if (!user) {
        throw new Error('Email change token user was not found');
      }

      user.email = params.email;
      const saved = await userRepo.save(user);
      await tokenRepo.update(
        { id: params.tokenRow.id },
        { usedAt: new Date() },
      );
      return saved;
    });
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
