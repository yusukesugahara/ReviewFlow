import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../../common/errors';
import { UserRole } from '../../../../../models/constants/user-role';
import { PasswordResetToken } from '../../../../../models/entities/password-reset-token.entity';
import { User } from '../../../../../models/entities/user.entity';
import { AuthRepository } from '../../../../../models/repositories/auth.repository';
import { MailService } from '../../../mail/services/mail.service';
import { UsersService } from '../../../users/services/users.service';
import { AuthPasswordResetService } from './auth-password-reset.service';

/**
 * AuthPasswordResetService のテスト
 *
 * @group auth-password-reset-service
 */
describe('AuthPasswordResetService', () => {
  let service: AuthPasswordResetService;
  let users: jest.Mocked<Pick<UsersService, 'findAllByEmail'>>;
  let authRepository: {
    createPasswordResetToken: jest.Mock;
    findPasswordResetToken: jest.Mock;
    updatePasswordAndMarkResetTokenUsed: jest.Mock;
  };
  let mailService: { sendPasswordResetEmail: jest.Mock };

  const activeUser = {
    id: 'u1',
    tenantId: 't1',
    email: 'a@b.com',
    passwordHash: 'h',
    role: UserRole.TENANT_USER,
    name: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    users = {
      findAllByEmail: jest.fn(),
    };
    authRepository = {
      createPasswordResetToken: jest.fn((x: object) =>
        Promise.resolve({ id: 'reset-1', ...x }),
      ),
      findPasswordResetToken: jest.fn(),
      updatePasswordAndMarkResetTokenUsed: jest.fn(),
    };
    mailService = { sendPasswordResetEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordResetService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AuthPasswordResetService);
  });

  describe('requestPasswordReset', () => {
    /**
     * アクティブなユーザに対してリセットトークンを作成し、メールを送信すること
     */
    it('creates reset token and sends mail for active users', async () => {
      users.findAllByEmail.mockResolvedValue([
        activeUser,
        {
          ...activeUser,
          id: 'u2',
          isActive: false,
        },
      ]);

      await expect(
        service.requestPasswordReset({ email: 'A@B.com' }),
      ).resolves.toEqual({ ok: true });

      expect(users.findAllByEmail).toHaveBeenCalledWith('a@b.com');
      expect(authRepository.createPasswordResetToken).toHaveBeenCalledTimes(1);
      expect(authRepository.createPasswordResetToken).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          email: 'a@b.com',
          token: expect.any(String) as string,
          expiresAt: expect.any(Date) as Date,
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

    it('does not reveal whether an email exists', async () => {
      users.findAllByEmail.mockResolvedValue([]);

      await expect(
        service.requestPasswordReset({ email: 'missing@example.com' }),
      ).resolves.toEqual({ ok: true });

      expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirmPasswordReset', () => {
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
      } as PasswordResetToken;
      authRepository.findPasswordResetToken.mockResolvedValue(tokenRow);

      await expect(
        service.confirmPasswordReset({
          token: 'token',
          password: 'newpassword12',
        }),
      ).resolves.toEqual({ ok: true });

      expect(authRepository.findPasswordResetToken).toHaveBeenCalledWith(
        'token',
      );
      expect(
        authRepository.updatePasswordAndMarkResetTokenUsed,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenRow,
          passwordHash: expect.any(String) as string,
        }),
      );
    });

    it('rejects invalid reset tokens', async () => {
      authRepository.findPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.confirmPasswordReset({
          token: 'missing-token',
          password: 'newpassword12',
        }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('rejects already used reset tokens', async () => {
      authRepository.findPasswordResetToken.mockResolvedValue({
        id: 'rt1',
        tenantId: 't1',
        userId: 'u1',
        email: 'a@b.com',
        token: 'token',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });

      await expect(
        service.confirmPasswordReset({
          token: 'token',
          password: 'newpassword12',
        }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('rejects expired reset tokens', async () => {
      authRepository.findPasswordResetToken.mockResolvedValue({
        id: 'rt1',
        tenantId: 't1',
        userId: 'u1',
        email: 'a@b.com',
        token: 'token',
        expiresAt: new Date(Date.now() - 60_000),
        usedAt: null,
      });

      await expect(
        service.confirmPasswordReset({
          token: 'token',
          password: 'newpassword12',
        }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });
  });
});
