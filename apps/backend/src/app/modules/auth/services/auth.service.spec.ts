import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../../common/errors';
import { UserRole } from '../../../../models/constants/user-role';
import { PasswordResetToken } from '../../../../models/entities/password-reset-token.entity';
import { Tenant } from '../../../../models/entities/tenant.entity';
import { User } from '../../../../models/entities/user.entity';
import { MailService } from '../../mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from './auth.service';

/**
 * AuthService のテスト
 *
 * @group auth-service
 */
describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findAllByEmail'>>;
  let jwt: { sign: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let passwordResetTokens: {
    create: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mailService: { sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    users = {
      findAllByEmail: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
    dataSource = { transaction: jest.fn() };
    passwordResetTokens = {
      create: jest.fn((x: object) => ({ ...x })),
      findOne: jest.fn(),
      save: jest.fn((x: object) => Promise.resolve({ id: 'reset-1', ...x })),
    };
    mailService = { sendPasswordResetEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwt },
        { provide: getDataSourceToken(), useValue: dataSource },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: passwordResetTokens,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    /**
     * email が既に使用されている場合にエラーを返すこと
     */
    it('throws when email is already taken', async () => {
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: 'h',
          role: UserRole.TENANT_ADMIN,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      await expect(
        service.register({ email: 'a@b.com', password: 'password12' }),
      ).rejects.toMatchObject({ errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN });
    });
    /**
     * tenant + tenant_admin を作成し、tenantId を JWT に含めること
     */
    it('creates tenant + tenant_admin and signs JWT with tenantId', async () => {
      users.findAllByEmail.mockResolvedValue([]);
      const tenantRepo = {
        create: jest.fn((x: object) => ({ ...x })),
        save: jest.fn((t: Tenant) => {
          Object.assign(t, { id: 'tenant-1' });
          return Promise.resolve(t);
        }),
      };
      const userRepo = {
        create: jest.fn((x: object) => ({ ...x })),
        save: jest.fn((u: User) => {
          Object.assign(u, { id: 'id-admin' });
          return Promise.resolve(u);
        }),
      };

      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Tenant) {
            return tenantRepo;
          }
          if (entity === User) {
            return userRepo;
          }
          throw new Error('unexpected entity');
        },
      };

      dataSource.transaction.mockImplementation(
        async (fn: (m: typeof manager) => Promise<User>) => {
          return fn(manager);
        },
      );

      const out = await service.register({
        email: 'First@Example.com',
        password: 'password12',
      });

      expect(tenantRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'id-admin',
        email: 'first@example.com',
        tenantId: 'tenant-1',
        role: UserRole.TENANT_ADMIN,
      });
      expect(out.user).toEqual({
        id: 'id-admin',
        email: 'first@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
      });
      expect(out.access_token).toBe('signed-jwt');
    });
  });

  describe('login', () => {
    it('throws when user does not exist', async () => {
      users.findAllByEmail.mockResolvedValue([]);
      await expect(
        service.login({ email: 'x@y.com', password: 'password12' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });
    /**
     * パスワードが一致しない場合にエラーを返すこと
     */
    it('throws when password does not match', async () => {
      const hash = await bcrypt.hash('correct', 4);
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: hash,
          role: UserRole.TENANT_USER,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrongpassword' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    /**
     * パスワードが一致する場合にトークンを返すこと
     */
    it('returns tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('password12', 4);
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: hash,
          role: UserRole.TENANT_USER,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      const out = await service.login({
        email: 'a@b.com',
        password: 'password12',
      });

      expect(out.access_token).toBe('signed-jwt');
      expect(out.user).toEqual({
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.TENANT_USER,
        tenantId: 't1',
      });
    });
  });

  describe('password reset', () => {
    /**
     * アクティブなユーザーに対してリセットトークンを作成し、メールを送信すること
     */
    it('creates reset token and sends mail for active users', async () => {
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: 'h',
          role: UserRole.TENANT_USER,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      await service.requestPasswordReset({ email: 'A@B.com' });

      expect(passwordResetTokens.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          email: 'a@b.com',
          usedAt: null,
        }),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'a@b.com',
          resetToken: expect.any(String) as string,
          expiresAtIso: expect.any(String) as string,
        }),
      );
    });

    /**
     * パスワードを更新し、トークンを使用済みにすること
     */
    it('updates password and marks token used', async () => {
      const tokenRow = {
        id: 'rt1',
        tenantId: 't1',
        userId: 'u1',
        email: 'a@b.com',
        token: 'token',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      };
      passwordResetTokens.findOne.mockResolvedValue(tokenRow);
      const userRepo = { update: jest.fn() };
      const resetRepo = { update: jest.fn() };
      dataSource.transaction.mockImplementation(
        (
          fn: (manager: {
            getRepository: (
              entity: unknown,
            ) => typeof userRepo | typeof resetRepo;
          }) => Promise<unknown>,
        ) =>
          fn({
            getRepository: (entity: unknown) =>
              entity === User ? userRepo : resetRepo,
          }),
      );

      await service.confirmPasswordReset({
        token: 'token',
        password: 'newpassword12',
      });

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'u1', tenantId: 't1', email: 'a@b.com' },
        { passwordHash: expect.any(String) as string },
      );
      expect(resetRepo.update).toHaveBeenCalledWith(
        { id: 'rt1' },
        { usedAt: expect.any(Date) as Date },
      );
    });
  });
});
