import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../../common/errors';
import { InvitationStatus } from '../../../../models/constants/invitation-status';
import { UserRole } from '../../../../models/constants/user-role';
import { Invitation } from '../../../../models/entities/invitation.entity';
import { User } from '../../../../models/entities/user.entity';
import {
  InvitationRepositoryError,
  InvitationsRepository,
} from '../../../../models/repositories/invitations.repository';
import {
  TransactionService,
  type TransactionManager,
} from '../../../transaction';
import { BusinessAuditLogService } from '../../audit-logs/services/business-audit-log.service';
import { AuthService } from '../../auth/services/facades/auth.service';
import { MailService } from '../../mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';
import { InvitationsService } from './invitations.service';

/**
 * InvitationsService のテスト
 *
 * @group invitations-service
 */
describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationsRepository: {
    findPendingByTenantAndEmail: jest.Mock;
    createInvitation: jest.Mock;
    deleteInvitation: jest.Mock;
    acceptInvitation: jest.Mock;
  };
  let usersService: {
    findByTenantAndEmail: jest.Mock;
  };
  let authService: { issueTokensForUser: jest.Mock };
  let mailService: { sendInvitationEmail: jest.Mock };
  let auditLogs: {
    recordInvitationAccepted: jest.Mock;
    recordInvitationCreated: jest.Mock;
  };
  let transactionManager: TransactionManager;
  let transactions: {
    run: jest.Mock;
  };

  beforeEach(async () => {
    invitationsRepository = {
      findPendingByTenantAndEmail: jest.fn(),
      createInvitation: jest.fn((row: Partial<Invitation>) =>
        Promise.resolve({
          id: 'inv-1',
          token: 't'.repeat(64),
          expiresAt: new Date(Date.now() + 60_000),
          ...row,
        } as Invitation),
      ),
      deleteInvitation: jest.fn(),
      acceptInvitation: jest.fn(),
    };
    usersService = { findByTenantAndEmail: jest.fn() };
    authService = { issueTokensForUser: jest.fn() };
    mailService = { sendInvitationEmail: jest.fn() };
    auditLogs = {
      recordInvitationAccepted: jest.fn(),
      recordInvitationCreated: jest.fn(),
    };
    transactionManager = {} as TransactionManager;
    transactions = {
      run: jest.fn(<T>(work: (manager: TransactionManager) => Promise<T>) =>
        work(transactionManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: InvitationsRepository, useValue: invitationsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
        { provide: BusinessAuditLogService, useValue: auditLogs },
        { provide: TransactionService, useValue: transactions },
      ],
    }).compile();

    service = module.get(InvitationsService);
  });

  const actor = {
    id: 'admin-1',
    email: 'a@t.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_ADMIN],
  };

  describe('create', () => {
    /**
     * テナント内に既存ユーザがいる場合にエラーを返すこと
     */
    it('throws when user already exists in tenant', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue({ id: 'u1' });

      await expect(
        service.create({ email: 'x@y.com', role: UserRole.TENANT_USER }, actor),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_MEMBER_EXISTS,
      });
    });

    /**
     * テナント内に既存の招待がある場合にエラーを返すこと
     */
    it('throws when pending invitation exists', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepository.findPendingByTenantAndEmail.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
      });

      await expect(
        service.create({ email: 'x@y.com', role: UserRole.TENANT_USER }, actor),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_PENDING_EXISTS,
      });
    });

    /**
     * 招待を保存し、トークンを含まないこと
     */
    it('persists invitation with token', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepository.findPendingByTenantAndEmail.mockResolvedValue(null);

      const out = await service.create(
        { email: 'New@Y.com', role: UserRole.TENANT_USER },
        actor,
      );

      expect(invitationsRepository.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          email: 'new@y.com',
          role: UserRole.TENANT_USER,
          invitedByUserId: 'admin-1',
        }),
      );
      expect(out.email).toBe('new@y.com');
      expect(out).not.toHaveProperty('token');
      expect(typeof out.expiresAt).toBe('string');
      expect(mailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@y.com',
          invitedByEmail: 'a@t.com',
          role: UserRole.TENANT_USER,
        }),
      );
      expect(auditLogs.recordInvitationCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
        }),
      );
    });

    /**
     * メール配信失敗時に招待をロールバックすること
     */
    it('rolls back invitation when mail delivery fails', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepository.findPendingByTenantAndEmail.mockResolvedValue(null);
      invitationsRepository.createInvitation.mockResolvedValue({
        id: 'inv-1',
        tenantId: 'tenant-1',
        email: 'new@y.com',
        role: UserRole.TENANT_USER,
        token: 't'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
      });
      mailService.sendInvitationEmail.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.create(
          { email: 'New@Y.com', role: UserRole.TENANT_USER },
          actor,
        ),
      ).rejects.toMatchObject({
        status: 500,
      });

      expect(invitationsRepository.deleteInvitation).toHaveBeenCalledWith(
        'inv-1',
      );
      expect(auditLogs.recordInvitationCreated).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    /**
     * 未知のトークンに対してエラーを返すこと
     */
    it('throws when token unknown', async () => {
      invitationsRepository.acceptInvitation.mockRejectedValue(
        new InvitationRepositoryError('not_found'),
      );

      await expect(
        service.accept({ token: 'bad', password: 'password12' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_NOT_FOUND,
      });
    });

    /**
     * 招待を受け入れ、ユーザを作成し、トークンを返すこと
     */
    it('creates user and returns tokens', async () => {
      let capturedPasswordHash = '';
      const acceptedInvitation = {
        id: 'inv-1',
        tenantId: 'tenant-1',
        email: 'join@y.com',
        role: UserRole.TENANT_USER,
        groupId: null,
        groupRole: null,
      } as Invitation;
      const acceptedUser = {
        id: 'new-user',
        tenantId: 'tenant-1',
        email: 'join@y.com',
        role: UserRole.TENANT_USER,
      } as User;
      invitationsRepository.acceptInvitation.mockImplementation(
        ({ passwordHash }: { passwordHash: string }) => {
          capturedPasswordHash = passwordHash;
          return Promise.resolve({
            invitation: acceptedInvitation,
            user: acceptedUser,
          });
        },
      );

      authService.issueTokensForUser.mockReturnValue({
        access_token: 'jwt',
        user: {
          id: 'new-user',
          email: 'join@y.com',
          role: UserRole.TENANT_USER,
          tenantId: 'tenant-1',
        },
      });

      const out = await service.accept({
        token: 'tok',
        name: 'Joiner',
        password: 'password12',
      });

      await expect(
        bcrypt.compare('password12', capturedPasswordHash),
      ).resolves.toBe(true);
      expect(invitationsRepository.acceptInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'tok',
          name: 'Joiner',
        }),
        transactionManager,
      );
      expect(out.access_token).toBe('jwt');
      expect(auditLogs.recordInvitationAccepted).toHaveBeenCalledWith(
        expect.objectContaining({
          invitation: acceptedInvitation,
          user: acceptedUser,
        }),
        transactionManager,
      );
    });
  });
});
