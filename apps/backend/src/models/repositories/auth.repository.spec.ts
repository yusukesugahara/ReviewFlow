import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { TenantPlan, TenantStatus } from '../constants/tenant-enums';
import { UserRole } from '../constants/user-role';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let passwordResetTokens: jest.Mocked<
    Pick<Repository<PasswordResetToken>, 'create' | 'save' | 'findOne'>
  >;
  let tenantRepo: { create: jest.Mock; save: jest.Mock };
  let userRepo: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    passwordResetTokens = {
      create: jest.fn(
        (row: Partial<PasswordResetToken>) => row as PasswordResetToken,
      ),
      save: jest.fn((row: PasswordResetToken) => Promise.resolve(row)),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<PasswordResetToken>, 'create' | 'save' | 'findOne'>
    >;
    tenantRepo = {
      create: jest.fn((row: Partial<Tenant>) => row as Tenant),
      save: jest.fn((row: Tenant) => {
        row.id = 'tenant-1';
        return Promise.resolve(row);
      }),
    };
    userRepo = {
      create: jest.fn((row: Partial<User>) => row as User),
      save: jest.fn((row: User) => Promise.resolve({ ...row, id: 'user-1' })),
      update: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => Promise<User>) =>
        fn({
          getRepository: (entity: unknown) => {
            if (entity === Tenant) return tenantRepo;
            if (entity === User) return userRepo;
            throw new Error('unexpected entity');
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: passwordResetTokens,
        },
      ],
    }).compile();

    repository = module.get(AuthRepository);
  });

  it('creates tenant admin in one transaction', async () => {
    const user = await repository.createTenantAdmin({
      email: 'admin@example.com',
      passwordHash: 'hash',
      tenantName: 'Workspace',
    });

    expect(user.id).toBe('user-1');
    expect(tenantRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Workspace',
        plan: TenantPlan.FREE,
        status: TenantStatus.TRIAL,
      }),
    );
    expect(userRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: UserRole.TENANT_ADMIN,
      name: null,
      isActive: true,
    });
  });

  it('creates password reset tokens', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');

    await repository.createPasswordResetToken({
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'user@example.com',
      token: 'token',
      expiresAt,
    });

    expect(passwordResetTokens.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'user@example.com',
      token: 'token',
      expiresAt,
      usedAt: null,
    });
  });
});
