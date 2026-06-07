import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../../common/errors';
import { InvitationStatus } from '../../../../models/constants/invitation-status';
import { UserRole } from '../../../../models/constants/user-role';
import { Invitation } from '../../../../models/entities/invitation.entity';
import { User } from '../../../../models/entities/user.entity';
import { AuthService } from '../../auth/services/auth.service';
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
  let invitationsRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let usersService: {
    findByTenantAndEmail: jest.Mock;
  };
  let authService: { issueTokensForUser: jest.Mock };
  let mailService: { sendInvitationEmail: jest.Mock };

  beforeEach(async () => {
    invitationsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((row: Invitation) => Promise.resolve(row)),
      delete: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };
    usersService = { findByTenantAndEmail: jest.fn() };
    authService = { issueTokensForUser: jest.fn() };
    mailService = { sendInvitationEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: invitationsRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
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
     * テナント内に既存ユーザーがいる場合にエラーを返すこと
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
      invitationsRepo.findOne.mockResolvedValue({
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
      invitationsRepo.findOne.mockResolvedValue(null);

      const out = await service.create(
        { email: 'New@Y.com', role: UserRole.TENANT_USER },
        actor,
      );

      expect(invitationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          email: 'new@y.com',
          role: UserRole.TENANT_USER,
          invitedByUserId: 'admin-1',
          status: InvitationStatus.PENDING,
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
    });

    /**
     * メール配信失敗時に招待をロールバックすること
     */
    it('rolls back invitation when mail delivery fails', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepo.findOne.mockResolvedValue(null);
      invitationsRepo.save.mockResolvedValue({
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

      expect(invitationsRepo.delete).toHaveBeenCalledWith('inv-1');
    });
  });

  describe('accept', () => {
    /**
     * 未知のトークンに対してエラーを返すこと
     */
    it('throws when token unknown', async () => {
      dataSource.transaction.mockImplementation(
        (fn: (m: unknown) => unknown) => {
          const invRepo = {
            findOne: jest.fn().mockResolvedValue(null),
          };
          const userRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          };
          return Promise.resolve(
            fn({
              getRepository: (e: unknown) =>
                e === Invitation ? invRepo : userRepo,
            }),
          );
        },
      );

      await expect(
        service.accept({ token: 'bad', password: 'password12' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_NOT_FOUND,
      });
    });

    /**
     * 招待を受け入れ、ユーザーを作成し、トークンを返すこと
     */
    it('creates user and returns tokens', async () => {
      const inv: Partial<Invitation> = {
        tenantId: 'tenant-1',
        email: 'join@y.com',
        role: UserRole.TENANT_USER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      };

      const invRepo = {
        findOne: jest.fn().mockResolvedValue(inv),
        save: jest.fn(),
      };
      const userRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((u: object) => u),
        save: jest.fn((u: User & { id?: string }) => {
          u.id = 'new-user';
          return Promise.resolve(u);
        }),
      };

      dataSource.transaction.mockImplementation(
        (fn: (m: unknown) => unknown) => {
          return Promise.resolve(
            fn({
              getRepository: (e: unknown) =>
                e === Invitation ? invRepo : userRepo,
            }),
          );
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

      expect(userRepo.save).toHaveBeenCalled();
      const savedUser = userRepo.save.mock.calls[0][0];
      expect(savedUser.email).toBe('join@y.com');
      await expect(
        bcrypt.compare('password12', savedUser.passwordHash),
      ).resolves.toBe(true);
      expect(invRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      );
      expect(out.access_token).toBe('jwt');
    });
  });
});
