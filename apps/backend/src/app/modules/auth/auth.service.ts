import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import {
  TenantPlan,
  TenantStatus,
} from '../../../models/constants/tenant-enums';
import { UserRole } from '../../../models/constants/user-role';
import { Tenant } from '../../../models/entities/tenant.entity';
import { PasswordResetToken } from '../../../models/entities/password-reset-token.entity';
import { User } from '../../../models/entities/user.entity';
import type { AccessTokenPayload } from '../../../strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import type {
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
} from './auth.dto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type ApplicantAccessTokenPayload = {
  kind: 'applicant_access';
  tenantId: string;
  email: string;
  groupId: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokens: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const taken = await this.usersService.findAllByEmail(email);
    if (taken.length > 0) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const tenantName = dto.organizationName?.trim() || 'My workspace';

    const user = await this.dataSource.transaction(async (manager) => {
      const tenantRepo = manager.getRepository(Tenant);
      const userRepo = manager.getRepository(User);
      const tenant = tenantRepo.create({
        name: tenantName,
        plan: TenantPlan.FREE,
        status: TenantStatus.TRIAL,
      });
      await tenantRepo.save(tenant);
      const row = userRepo.create({
        tenantId: tenant.id,
        email,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        name: null,
        isActive: true,
      });
      return userRepo.save(row);
    });

    return this.issueTokens(user);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase();
    const users = (await this.usersService.findAllByEmail(email)).filter(
      (user) => user.isActive,
    );

    for (const user of users) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      const saved = await this.passwordResetTokens.save(
        this.passwordResetTokens.create({
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          token,
          expiresAt,
          usedAt: null,
        }),
      );

      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        resetToken: saved.token,
        expiresAtIso: saved.expiresAt.toISOString(),
      });
    }

    return { ok: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const row = await this.passwordResetTokens.findOne({
      where: { token: dto.token },
    });
    if (!row || row.usedAt || new Date() > row.expiresAt) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update(
          { id: row.userId, tenantId: row.tenantId, email: row.email },
          { passwordHash },
        );
      await manager
        .getRepository(PasswordResetToken)
        .update({ id: row.id }, { usedAt: new Date() });
    });

    return { ok: true };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    let candidates = await this.usersService.findAllByEmail(email);
    if (candidates.length === 0) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    if (dto.tenantId) {
      candidates = candidates.filter((u) => u.tenantId === dto.tenantId);
    }
    if (candidates.length === 0) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const passwordMatches: User[] = [];
    for (const u of candidates) {
      if (await bcrypt.compare(dto.password, u.passwordHash)) {
        passwordMatches.push(u);
      }
    }
    if (passwordMatches.length === 0) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    if (passwordMatches.length > 1) {
      throw clientError(ClientErrorCodes.AUTH_TENANT_REQUIRED);
    }
    const user = passwordMatches[0];
    if (!user.isActive) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    return this.issueTokens(user);
  }

  /** 招待受諾後など、既存ユーザーに対してログイン相当のトークンを返す */
  issueTokensForUser(user: User) {
    return this.issueTokens(user);
  }

  issueApplicantAccessToken(input: {
    tenantId: string;
    email: string;
    groupId: string;
  }): string {
    const payload: ApplicantAccessTokenPayload = {
      kind: 'applicant_access',
      tenantId: input.tenantId,
      email: input.email,
      groupId: input.groupId,
    };
    return this.jwtService.sign(payload);
  }

  verifyApplicantAccessToken(token: string): ApplicantAccessTokenPayload {
    const payload = this.jwtService.verify<ApplicantAccessTokenPayload>(token);
    if (
      payload.kind !== 'applicant_access' ||
      !payload.tenantId ||
      !payload.email ||
      !payload.groupId
    ) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    return payload;
  }

  private issueTokens(user: User) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
