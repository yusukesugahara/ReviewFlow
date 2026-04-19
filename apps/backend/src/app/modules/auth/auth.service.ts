import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { TenantPlan, TenantStatus } from '../../../models/constants/tenant-enums';
import { UserRole } from '../../../models/constants/user-role';
import { Tenant } from '../../../models/entities/tenant.entity';
import { User } from '../../../models/entities/user.entity';
import type { AccessTokenPayload } from '../../../strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import type { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
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
    const user = passwordMatches[0]!;
    if (!user.isActive) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    return this.issueTokens(user);
  }

  /** 招待受諾後など、既存ユーザーに対してログイン相当のトークンを返す */
  issueTokensForUser(user: User) {
    return this.issueTokens(user);
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
