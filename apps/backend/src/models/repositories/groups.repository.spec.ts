import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { GroupMemberRole } from '../constants/group-member-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import { GroupsRepository } from './groups.repository';

describe('GroupsRepository', () => {
  let repository: GroupsRepository;
  let groups: jest.Mocked<
    Pick<Repository<Group>, 'find' | 'findOne' | 'count' | 'save' | 'delete'>
  >;
  let members: jest.Mocked<
    Pick<
      Repository<GroupMember>,
      'find' | 'findOne' | 'findOneOrFail' | 'create' | 'save' | 'delete'
    >
  >;
  let txGroups: { create: jest.Mock; save: jest.Mock };
  let txMembers: { create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    groups = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    members = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    txGroups = {
      create: jest.fn((row: Partial<Group>) => row as Group),
      save: jest.fn((row: Group) => Promise.resolve({ ...row, id: 'group-1' })),
    };
    txMembers = {
      create: jest.fn((row: Partial<GroupMember>) => row as GroupMember),
      save: jest.fn((rows: GroupMember[]) => Promise.resolve(rows)),
    };
    dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => Promise<Group>) =>
        fn({
          getRepository: (entity: unknown) =>
            entity === Group ? txGroups : txMembers,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsRepository,
        { provide: getRepositoryToken(Group), useValue: groups },
        { provide: getRepositoryToken(GroupMember), useValue: members },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get(GroupsRepository);
  });

  it('finds tenant groups ordered by creation time', async () => {
    groups.find.mockResolvedValue([]);

    await repository.findGroupsByTenant('tenant-1');

    expect(groups.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      order: { createdAt: 'ASC' },
    });
  });

  it('creates a group and admin memberships in one transaction', async () => {
    const group = await repository.createGroupWithAdmins({
      tenantId: 'tenant-1',
      name: 'Team A',
      description: '  Description  ',
      createdByUserId: 'creator-1',
      adminUserIds: ['admin-1', 'admin-2'],
    });

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(group.id).toBe('group-1');
    expect(txGroups.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      name: 'Team A',
      description: 'Description',
      createdByUserId: 'creator-1',
    });
    expect(txMembers.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tenantId: 'tenant-1',
        groupId: 'group-1',
        userId: 'admin-1',
        role: GroupMemberRole.ADMIN,
        invitedByUserId: 'creator-1',
      }),
      expect.objectContaining({
        tenantId: 'tenant-1',
        groupId: 'group-1',
        userId: 'admin-2',
        role: GroupMemberRole.ADMIN,
        invitedByUserId: 'creator-1',
      }),
    ]);
  });

  it('finds admin membership by tenant group and user', async () => {
    members.findOne.mockResolvedValue(null);

    await repository.findAdminMember('tenant-1', 'group-1', 'user-1');

    expect(members.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        groupId: 'group-1',
        userId: 'user-1',
        role: GroupMemberRole.ADMIN,
      },
    });
  });

  it('saves group details', async () => {
    const group = { id: 'group-1', name: 'Updated' } as Group;
    groups.save.mockResolvedValue(group);

    await expect(repository.saveGroup(group)).resolves.toBe(group);

    expect(groups.save).toHaveBeenCalledWith(group);
  });
});
