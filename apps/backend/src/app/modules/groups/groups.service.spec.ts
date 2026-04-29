import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClientErrorCodes } from '../../../common/errors';
import { GroupMemberRole } from '../../../models/constants/group-member-role';
import { UserRole } from '../../../models/constants/user-role';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { User } from '../../../models/entities/user.entity';
import { UsersService } from '../users/users.service';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let membersRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let usersService: {
    findAllByIdsInTenant: jest.Mock;
    findByIdAndTenant: jest.Mock;
  };

  const systemAdmin = {
    id: 'sys-1',
    email: 'sys@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_ADMIN],
  };

  const groupAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_USER],
  };

  const regularUser = {
    id: 'user-1',
    email: 'user@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_USER],
  };

  beforeEach(async () => {
    groupsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((row: Group) =>
        Promise.resolve(
          Object.assign(
            {
              id: 'group-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            row,
          ),
        ),
      ),
      delete: jest.fn(() => Promise.resolve()),
    };
    membersRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((row: GroupMember | GroupMember[]) => Promise.resolve(row)),
      delete: jest.fn(() => Promise.resolve()),
    };
    dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => unknown) =>
        Promise.resolve(
          fn({
            getRepository: (entity: unknown) =>
              entity === Group ? groupsRepo : membersRepo,
          }),
        ),
      ),
    };
    usersService = {
      findAllByIdsInTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: groupsRepo },
        { provide: getRepositoryToken(GroupMember), useValue: membersRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get(GroupsService);
  });

  it('creates a group with initial group admins', async () => {
    groupsRepo.findOne.mockResolvedValue(null);
    usersService.findAllByIdsInTenant.mockResolvedValue([
      { id: 'admin-1' } as User,
      { id: 'admin-2' } as User,
    ]);

    const out = await service.create(
      {
        name: 'Team A',
        adminUserIds: ['admin-1', 'admin-2'],
      },
      systemAdmin,
    );

    expect(out.id).toBe('group-1');
    expect(groupsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Team A',
        createdByUserId: 'sys-1',
      }),
    );
    expect(membersRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'admin-1',
        role: GroupMemberRole.ADMIN,
      }),
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'admin-2',
        role: GroupMemberRole.ADMIN,
      }),
    ]);
  });

  it('rejects initial admins outside the tenant', async () => {
    groupsRepo.findOne.mockResolvedValue(null);
    usersService.findAllByIdsInTenant.mockResolvedValue([{ id: 'admin-1' }]);

    await expect(
      service.create(
        { name: 'Team A', adminUserIds: ['admin-1', 'missing-user'] },
        systemAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
    });
  });

  it('allows a group admin to add a member', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne
      .mockResolvedValueOnce({ userId: 'admin-1', role: GroupMemberRole.ADMIN })
      .mockResolvedValueOnce(null);
    usersService.findByIdAndTenant.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
    } as User);

    const out = await service.addMember(
      'group-1',
      { userId: 'user-1', role: GroupMemberRole.USER },
      groupAdmin,
    );

    expect(out.user.email).toBe('user@example.com');
    expect(membersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'user-1',
        invitedByUserId: 'admin-1',
      }),
    );
  });

  it('rejects member management by non group admins', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne.mockResolvedValue(null);

    await expect(
      service.addMember(
        'group-1',
        { userId: 'user-2', role: GroupMemberRole.USER },
        regularUser,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });
  });

  it('protects the last group admin from demotion', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne
      .mockResolvedValueOnce({ userId: 'admin-1', role: GroupMemberRole.ADMIN })
      .mockResolvedValueOnce({
        id: 'member-1',
        userId: 'admin-1',
        role: GroupMemberRole.ADMIN,
      });
    membersRepo.find.mockResolvedValue([
      { userId: 'admin-1', role: GroupMemberRole.ADMIN },
    ]);

    await expect(
      service.updateMemberRole(
        'group-1',
        'admin-1',
        { role: GroupMemberRole.USER },
        groupAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.LAST_GROUP_ADMIN_PROTECTED,
    });
  });
});
