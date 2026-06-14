import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../../common/errors';
import { UserRole } from '../../../../../models/constants/user-role';
import { EmailChangeToken } from '../../../../../models/entities/email-change-token.entity';
import { User } from '../../../../../models/entities/user.entity';
import { AuthRepository } from '../../../../../models/repositories/auth.repository';
import { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import { MailService } from '../../../mail/services/mail.service';
import { UsersService } from '../../../users/services/users.service';
import { AuthEmailChangeService } from './auth-email-change.service';

describe('AuthEmailChangeService', () => {
  let service: AuthEmailChangeService;
  let authRepository: {
    createEmailChangeToken: jest.Mock;
    findEmailChangeToken: jest.Mock;
    updateEmailAndMarkEmailChangeTokenUsed: jest.Mock;
  };
  let users: {
    findByIdAndTenant: jest.Mock;
    findAllByEmail: jest.Mock;
  };
  let mailService: {
    sendEmailChangeConfirmationEmail: jest.Mock;
  };
  let auditLogs: {
    recordUserEvent: jest.Mock;
  };

  const actor = {
    id: 'user-1',
    email: 'old@example.com',
    tenantId: 'tenant-1',
  };

  const currentUser = (overrides: Partial<User> = {}) =>
    ({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'old@example.com',
      name: 'User One',
      passwordHash: 'hash',
      role: UserRole.TENANT_USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    authRepository = {
      createEmailChangeToken: jest.fn((input: object) =>
        Promise.resolve({ id: 'email-change-1', ...input }),
      ),
      findEmailChangeToken: jest.fn(),
      updateEmailAndMarkEmailChangeTokenUsed: jest.fn(),
    };
    users = {
      findByIdAndTenant: jest.fn(),
      findAllByEmail: jest.fn(),
    };
    mailService = {
      sendEmailChangeConfirmationEmail: jest.fn(),
    };
    auditLogs = {
      recordUserEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthEmailChangeService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mailService },
        { provide: BusinessAuditLogService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get(AuthEmailChangeService);
  });

  it('creates a pending email change token and sends confirmation email', async () => {
    users.findByIdAndTenant.mockResolvedValue(currentUser());
    users.findAllByEmail.mockResolvedValue([]);

    await expect(
      service.requestMeEmailChange({ email: ' New@Example.com ' }, actor),
    ).resolves.toEqual({ ok: true });

    expect(users.findByIdAndTenant).toHaveBeenCalledWith('user-1', 'tenant-1');
    expect(users.findAllByEmail).toHaveBeenCalledWith('new@example.com');
    expect(authRepository.createEmailChangeToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
        currentEmail: 'old@example.com',
        newEmail: 'new@example.com',
        token: expect.any(String) as string,
        expiresAt: expect.any(Date) as Date,
      }),
    );
    expect(mailService.sendEmailChangeConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        currentEmail: 'old@example.com',
        newEmail: 'new@example.com',
        confirmToken: expect.any(String) as string,
        expiresAtIso: expect.any(String) as string,
      }),
    );
  });

  it('rejects unchanged email requests', async () => {
    users.findByIdAndTenant.mockResolvedValue(currentUser());

    await expect(
      service.requestMeEmailChange({ email: 'old@example.com' }, actor),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.AUTH_EMAIL_UNCHANGED,
    });

    expect(authRepository.createEmailChangeToken).not.toHaveBeenCalled();
    expect(mailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
  });

  it('rejects email requests for emails used by another account', async () => {
    users.findByIdAndTenant.mockResolvedValue(currentUser());
    users.findAllByEmail.mockResolvedValue([
      currentUser({ id: 'other-user', email: 'new@example.com' }),
    ]);

    await expect(
      service.requestMeEmailChange({ email: 'new@example.com' }, actor),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN,
    });

    expect(authRepository.createEmailChangeToken).not.toHaveBeenCalled();
    expect(mailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
  });

  it('confirms a valid email change token and records an audit log', async () => {
    const tokenRow = {
      id: 'token-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      currentEmail: 'old@example.com',
      newEmail: 'new@example.com',
      token: 'token',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    } as EmailChangeToken;
    const saved = currentUser({ email: 'new@example.com' });
    authRepository.findEmailChangeToken.mockResolvedValue(tokenRow);
    authRepository.updateEmailAndMarkEmailChangeTokenUsed.mockResolvedValue(
      saved,
    );
    users.findByIdAndTenant.mockResolvedValue(currentUser());
    users.findAllByEmail.mockResolvedValue([]);

    await expect(
      service.confirmEmailChange({ token: 'token' }),
    ).resolves.toEqual({ ok: true });

    expect(authRepository.findEmailChangeToken).toHaveBeenCalledWith('token');
    expect(
      authRepository.updateEmailAndMarkEmailChangeTokenUsed,
    ).toHaveBeenCalledWith({
      tokenRow,
      email: 'new@example.com',
    });
    expect(auditLogs.recordUserEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'user.profile_updated',
        actor: { id: 'user-1', email: 'old@example.com' },
        target: saved,
        metadataJson: {
          emailFrom: 'old@example.com',
          emailTo: 'new@example.com',
        },
      }),
    );
  });

  it('rejects invalid email change tokens', async () => {
    authRepository.findEmailChangeToken.mockResolvedValue(null);

    await expect(
      service.confirmEmailChange({ token: 'missing' }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.AUTH_EMAIL_CHANGE_TOKEN_INVALID,
    });
  });

  it('rejects stale email change tokens after the current email changed', async () => {
    authRepository.findEmailChangeToken.mockResolvedValue({
      id: 'token-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      currentEmail: 'old@example.com',
      newEmail: 'new@example.com',
      token: 'token',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    users.findByIdAndTenant.mockResolvedValue(
      currentUser({ email: 'other@example.com' }),
    );

    await expect(
      service.confirmEmailChange({ token: 'token' }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.AUTH_EMAIL_CHANGE_TOKEN_INVALID,
    });

    expect(
      authRepository.updateEmailAndMarkEmailChangeTokenUsed,
    ).not.toHaveBeenCalled();
  });
});
