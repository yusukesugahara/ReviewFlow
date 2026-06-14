import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { GroupMemberRole } from '../constants/group-member-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { GroupsRepository } from './groups.repository';

type QueryBuilderMock = {
  addSelect: jest.Mock;
  andWhere: jest.Mock;
  getMany: jest.Mock;
  getRawAndEntities: jest.Mock;
  leftJoin: jest.Mock;
  orderBy: jest.Mock;
  where: jest.Mock;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const builder: QueryBuilderMock = {
    addSelect: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
    getRawAndEntities: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    where: jest.fn(),
  };
  builder.addSelect.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

describe('GroupsRepository', () => {
  let repository: GroupsRepository;
  let groups: jest.Mocked<
    Pick<
      Repository<Group>,
      'createQueryBuilder' | 'find' | 'findOne' | 'count' | 'save' | 'delete'
    >
  >;
  let members: jest.Mocked<
    Pick<
      Repository<GroupMember>,
      'find' | 'findOne' | 'findOneOrFail' | 'create' | 'save' | 'delete'
    >
  >;
  let users: jest.Mocked<Pick<Repository<User>, 'createQueryBuilder'>>;
  let groupBuilder: QueryBuilderMock;
  let userBuilder: QueryBuilderMock;
  let txGroups: { create: jest.Mock; save: jest.Mock };
  let txMembers: { create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    groupBuilder = createQueryBuilderMock();
    userBuilder = createQueryBuilderMock();
    groups = {
      createQueryBuilder: jest.fn().mockReturnValue(groupBuilder),
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
    users = {
      createQueryBuilder: jest.fn().mockReturnValue(userBuilder),
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
        { provide: getRepositoryToken(User), useValue: users },
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

  it('finds tenant groups with the current user role mapped in the query', async () => {
    const row = { id: 'group-1' } as Group;
    groupBuilder.getRawAndEntities.mockResolvedValue({
      entities: [row],
      raw: [{ currentUserRole: GroupMemberRole.ADMIN }],
    });

    await expect(
      repository.findGroupsByTenantWithCurrentUserRole('tenant-1', 'user-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'group-1',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
    ]);

    expect(groups.createQueryBuilder).toHaveBeenCalledWith('space');
    expect(groupBuilder.leftJoin).toHaveBeenCalledWith(
      GroupMember,
      'currentMember',
      expect.stringContaining('currentMember.groupId = space.id'),
      { userId: 'user-1' },
    );
    expect(groupBuilder.where).toHaveBeenCalledWith(
      'space.tenantId = :tenantId',
      { tenantId: 'tenant-1' },
    );
    expect(groupBuilder.orderBy).toHaveBeenCalledWith('space.createdAt', 'ASC');
  });

  it('finds member groups with the current user role assigned by the repository', async () => {
    const memberGroup = { id: 'group-1' } as Group;
    members.find.mockResolvedValue([
      { role: GroupMemberRole.USER, group: memberGroup } as GroupMember,
    ]);

    await expect(
      repository.findGroupsByMembershipForUser('tenant-1', 'user-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'group-1',
        currentUserRole: GroupMemberRole.USER,
      }),
    ]);

    expect(members.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1' },
      relations: { group: true },
      order: { createdAt: 'ASC' },
    });
  });

  it('finds tenant users who are not current group members in the query', async () => {
    const available = [{ id: 'user-2' } as User];
    userBuilder.getMany.mockResolvedValue(available);

    await expect(
      repository.findAvailableUsersForGroup('tenant-1', 'group-1'),
    ).resolves.toBe(available);

    expect(users.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(userBuilder.leftJoin).toHaveBeenCalledWith(
      GroupMember,
      'member',
      expect.stringContaining('member.userId = user.id'),
      { groupId: 'group-1' },
    );
    expect(userBuilder.where).toHaveBeenCalledWith(
      'user.tenantId = :tenantId',
      { tenantId: 'tenant-1' },
    );
    expect(userBuilder.andWhere).toHaveBeenCalledWith('member.id IS NULL');
    expect(userBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'ASC');
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
