import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../../common/errors';
import { UserRole } from '../../../../models/constants/user-role';
import { User } from '../../../../models/entities/user.entity';
import { AuthRepository } from '../../../../models/repositories/auth.repository';
import { UsersService } from '../../users/services/users.service';
import { AuthPasswordResetService } from './auth-password-reset.service';
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
  let authRepository: {
    createTenantAdmin: jest.Mock;
  };
  let passwordResetService: {
    requestPasswordReset: jest.Mock;
    confirmPasswordReset: jest.Mock;
  };

  beforeEach(async () => {
    users = {
      findAllByEmail: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
    authRepository = {
      createTenantAdmin: jest.fn(),
    };
    passwordResetService = {
      requestPasswordReset: jest.fn().mockResolvedValue({ ok: true }),
      confirmPasswordReset: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: UsersService, useValue: users },
        { provide: AuthPasswordResetService, useValue: passwordResetService },
        { provide: JwtService, useValue: jwt },
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
      authRepository.createTenantAdmin.mockResolvedValue({
        id: 'id-admin',
        tenantId: 'tenant-1',
        email: 'first@example.com',
        role: UserRole.TENANT_ADMIN,
      });

      const out = await service.register({
        email: 'First@Example.com',
        password: 'password12',
      });

      expect(authRepository.createTenantAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'first@example.com',
          tenantName: 'My workspace',
        }),
      );
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
    it('delegates password reset request to password reset service', async () => {
      const dto = { email: 'A@B.com' };

      await expect(service.requestPasswordReset(dto)).resolves.toEqual({
        ok: true,
      });

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        dto,
      );
    });

    it('delegates password reset confirmation to password reset service', async () => {
      const dto = {
        token: 'token',
        password: 'newpassword12',
      };

      await expect(service.confirmPasswordReset(dto)).resolves.toEqual({
        ok: true,
      });

      expect(passwordResetService.confirmPasswordReset).toHaveBeenCalledWith(
        dto,
      );
    });
  });
});
