import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../common/errors';
import { InvitationStatus } from '../../../models/constants/invitation-status';
import { UserRole } from '../../../models/constants/user-role';
import { Invitation } from '../../../models/entities/invitation.entity';
import { User } from '../../../models/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationsRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let usersService: {
    findByTenantAndEmail: jest.Mock;
  };
  let authService: { issueTokensForUser: jest.Mock };

  beforeEach(async () => {
    invitationsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn(async (row: Invitation) => row),
    };
    dataSource = { transaction: jest.fn() };
    usersService = { findByTenantAndEmail: jest.fn() };
    authService = { issueTokensForUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: invitationsRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
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
    it('throws when user already exists in tenant', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue({ id: 'u1' } as User);

      await expect(
        service.create(
          { email: 'x@y.com', role: UserRole.APPLICANT },
          actor,
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_MEMBER_EXISTS,
      });
    });

    it('throws when pending invitation exists', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
      });

      await expect(
        service.create(
          { email: 'x@y.com', role: UserRole.APPROVER },
          actor,
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.INVITATION_PENDING_EXISTS,
      });
    });

    it('persists invitation with token', async () => {
      usersService.findByTenantAndEmail.mockResolvedValue(null);
      invitationsRepo.findOne.mockResolvedValue(null);

      const out = await service.create(
        { email: 'New@Y.com', role: UserRole.APPLICANT },
        actor,
      );

      expect(invitationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          email: 'new@y.com',
          role: UserRole.APPLICANT,
          invitedByUserId: 'admin-1',
          status: InvitationStatus.PENDING,
        }),
      );
      expect(out.email).toBe('new@y.com');
      expect(out.token.length).toBe(64);
      expect(typeof out.expiresAt).toBe('string');
    });
  });

  describe('accept', () => {
    it('throws when token unknown', async () => {
      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => unknown) => {
        const invRepo = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        const userRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
        return fn({ getRepository: (e: unknown) => (e === Invitation ? invRepo : userRepo) });
      });

      await expect(
        service.accept({ token: 'bad', password: 'password12' }),
      ).rejects.toMatchObject({ errorCode: ClientErrorCodes.INVITATION_NOT_FOUND });
    });

    it('creates user and returns tokens', async () => {
      const inv: Partial<Invitation> = {
        tenantId: 'tenant-1',
        email: 'join@y.com',
        role: UserRole.APPROVER,
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
        save: jest.fn(async (u: User & { id?: string }) => {
          u.id = 'new-user';
          return u;
        }),
      };

      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => unknown) => {
        return fn({
          getRepository: (e: unknown) => (e === Invitation ? invRepo : userRepo),
        });
      });

      authService.issueTokensForUser.mockReturnValue({
        access_token: 'jwt',
        user: { id: 'new-user', email: 'join@y.com', role: UserRole.APPROVER, tenantId: 'tenant-1' },
      });

      const out = await service.accept({
        token: 'tok',
        name: 'Joiner',
        password: 'password12',
      });

      expect(userRepo.save).toHaveBeenCalled();
      const savedUser = userRepo.save.mock.calls[0][0] as User;
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
