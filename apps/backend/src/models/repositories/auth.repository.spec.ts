import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { TenantPlan, TenantStatus } from '../constants/tenant-enums';
import { UserRole } from '../constants/user-role';
import { EmailChangeToken } from '../entities/email-change-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let emailChangeTokens: jest.Mocked<
    Pick<Repository<EmailChangeToken>, 'create' | 'save' | 'findOne' | 'update'>
  >;
  let passwordResetTokens: jest.Mocked<
    Pick<Repository<PasswordResetToken>, 'create' | 'save' | 'findOne'>
  >;
  let tenantRepo: { create: jest.Mock; save: jest.Mock };
  let userRepo: {
    create: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    emailChangeTokens = {
      create: jest.fn(
        (row: Partial<EmailChangeToken>) => row as EmailChangeToken,
      ),
      save: jest.fn((row: EmailChangeToken) => Promise.resolve(row)),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<
        Repository<EmailChangeToken>,
        'create' | 'save' | 'findOne' | 'update'
      >
    >;
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
      findOne: jest.fn(),
      save: jest.fn((row: User) => Promise.resolve({ ...row, id: 'user-1' })),
      update: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => Promise<User>) =>
        fn({
          getRepository: (entity: unknown) => {
            if (entity === Tenant) return tenantRepo;
            if (entity === User) return userRepo;
            if (entity === EmailChangeToken) return emailChangeTokens;
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
          provide: getRepositoryToken(EmailChangeToken),
          useValue: emailChangeTokens,
        },
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

  it('creates email change tokens and expires previous pending tokens', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');

    await repository.createEmailChangeToken({
      tenantId: 'tenant-1',
      userId: 'user-1',
      currentEmail: 'old@example.com',
      newEmail: 'new@example.com',
      token: 'token',
      expiresAt,
    });

    expect(emailChangeTokens.update).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        usedAt: expect.any(Object) as object,
      },
      { usedAt: expect.any(Date) as Date },
    );
    expect(emailChangeTokens.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      currentEmail: 'old@example.com',
      newEmail: 'new@example.com',
      token: 'token',
      expiresAt,
      usedAt: null,
    });
  });

  it('updates user email and marks email change token used in one transaction', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'old@example.com',
    } as User;
    userRepo.findOne.mockResolvedValue(user);

    const out = await repository.updateEmailAndMarkEmailChangeTokenUsed({
      tokenRow: {
        id: 'email-change-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
      } as EmailChangeToken,
      email: 'new@example.com',
    });

    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1', tenantId: 'tenant-1' },
    });
    expect(userRepo.save).toHaveBeenCalledWith({
      ...user,
      email: 'new@example.com',
    });
    expect(emailChangeTokens.update).toHaveBeenCalledWith(
      { id: 'email-change-1' },
      { usedAt: expect.any(Date) as Date },
    );
    expect(out.email).toBe('new@example.com');
  });
});
