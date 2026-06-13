import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { GroupMemberRole } from '../constants/group-member-role';
import { InvitationStatus } from '../constants/invitation-status';
import { UserRole } from '../constants/user-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import { Invitation } from '../entities/invitation.entity';
import { User } from '../entities/user.entity';
import {
  InvitationRepositoryError,
  InvitationsRepository,
} from './invitations.repository';

describe('InvitationsRepository', () => {
  let repository: InvitationsRepository;
  let invitations: jest.Mocked<
    Pick<Repository<Invitation>, 'findOne' | 'create' | 'save' | 'delete'>
  >;
  let txInvitationRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let txUserRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let txGroupRepo: {
    findOne: jest.Mock;
  };
  let txMemberRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: { getRepository: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    invitations = {
      findOne: jest.fn(),
      create: jest.fn((row: Partial<Invitation>) => row as Invitation),
      save: jest.fn((row: Invitation) => Promise.resolve(row)),
      delete: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<Invitation>, 'findOne' | 'create' | 'save' | 'delete'>
    >;
    txInvitationRepo = {
      findOne: jest.fn(),
      save: jest.fn((row: Invitation) => Promise.resolve(row)),
    };
    txUserRepo = {
      findOne: jest.fn(),
      create: jest.fn((row: Partial<User>) => row as User),
      save: jest.fn((row: User) => {
        row.id = 'user-1';
        return Promise.resolve(row);
      }),
    };
    txGroupRepo = {
      findOne: jest.fn(),
    };
    txMemberRepo = {
      create: jest.fn((row: Partial<GroupMember>) => row as GroupMember),
      save: jest.fn((row: GroupMember) => Promise.resolve(row)),
    };
    dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Group) {
          return { findOne: jest.fn().mockResolvedValue({ id: 'group-1' }) };
        }
        if (entity === GroupMember) {
          return { findOne: jest.fn().mockResolvedValue({ id: 'member-1' }) };
        }
        throw new Error('unexpected entity');
      }),
      transaction: jest.fn((fn: (manager: unknown) => Promise<User>) =>
        fn({
          getRepository: (entity: unknown) => {
            if (entity === Invitation) return txInvitationRepo;
            if (entity === User) return txUserRepo;
            if (entity === Group) return txGroupRepo;
            if (entity === GroupMember) return txMemberRepo;
            throw new Error('unexpected transaction entity');
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsRepository,
        { provide: getRepositoryToken(Invitation), useValue: invitations },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get(InvitationsRepository);
  });

  it('finds pending invitations by tenant and email', async () => {
    invitations.findOne.mockResolvedValue(null);

    await repository.findPendingByTenantAndEmail('tenant-1', 'new@example.com');

    expect(invitations.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        email: 'new@example.com',
        status: InvitationStatus.PENDING,
      },
    });
  });

  it('creates pending invitations', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');

    await repository.createInvitation({
      tenantId: 'tenant-1',
      email: 'new@example.com',
      role: UserRole.TENANT_USER,
      groupId: null,
      groupRole: null,
      token: 'token',
      invitedByUserId: 'admin-1',
      expiresAt,
    });

    expect(invitations.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      email: 'new@example.com',
      role: UserRole.TENANT_USER,
      groupId: null,
      groupRole: null,
      token: 'token',
      status: InvitationStatus.PENDING,
      invitedByUserId: 'admin-1',
      expiresAt,
    });
  });

  it('accepts invitations and creates group membership in one transaction', async () => {
    txInvitationRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      email: 'new@example.com',
      role: UserRole.TENANT_USER,
      groupId: 'group-1',
      groupRole: GroupMemberRole.ADMIN,
      invitedByUserId: 'admin-1',
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    });
    txUserRepo.findOne.mockResolvedValue(null);
    txGroupRepo.findOne.mockResolvedValue({ id: 'group-1' });

    const result = await repository.acceptInvitation({
      token: 'token',
      passwordHash: 'hash',
      name: 'New User',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.invitation.id).toBe('inv-1');
    expect(txUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        email: 'new@example.com',
        passwordHash: 'hash',
        role: UserRole.TENANT_USER,
        name: 'New User',
        isActive: true,
      }),
    );
    expect(txMemberRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      userId: 'user-1',
      role: GroupMemberRole.ADMIN,
      invitedByUserId: 'admin-1',
    });
    expect(txInvitationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
    );
  });

  it('throws repository error when accepting unknown token', async () => {
    txInvitationRepo.findOne.mockResolvedValue(null);

    await expect(
      repository.acceptInvitation({
        token: 'missing',
        passwordHash: 'hash',
        name: null,
      }),
    ).rejects.toMatchObject({
      reason: 'not_found',
    } satisfies Partial<InvitationRepositoryError>);
  });
});
