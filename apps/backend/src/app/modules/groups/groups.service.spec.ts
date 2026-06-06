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

/**
 * GroupsService のテスト
 *
 * @group groups-service
 */
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
    findAllByTenant: jest.Mock;
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
      findAllByTenant: jest.fn(),
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

  /**
   * 現在のユーザーのスペースロールをグループごとに独立して返すこと
   */
  it('returns current user space roles independently per group', async () => {
    membersRepo.find.mockResolvedValue([
      {
        role: GroupMemberRole.ADMIN,
        group: { id: 'group-a', name: 'Aスペース' },
      },
      {
        role: GroupMemberRole.USER,
        group: { id: 'group-b', name: 'Bスペース' },
      },
    ]);

    const out = await service.list(groupAdmin);

    expect(out).toEqual([
      expect.objectContaining({
        id: 'group-a',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      expect.objectContaining({
        id: 'group-b',
        currentUserRole: GroupMemberRole.USER,
      }),
    ]);
  });

  /**
   * テナント管理者のグループ一覧をメンバーシップロールと共に返すこと
   */
  it('returns tenant admin groups with membership role when present', async () => {
    groupsRepo.find.mockResolvedValue([
      { id: 'group-a', name: 'Aスペース' },
      { id: 'group-b', name: 'Bスペース' },
    ]);
    membersRepo.find.mockResolvedValue([
      { groupId: 'group-a', role: GroupMemberRole.ADMIN },
    ]);

    const out = await service.list(systemAdmin);

    expect(out).toEqual([
      expect.objectContaining({
        id: 'group-a',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      expect.objectContaining({ id: 'group-b', currentUserRole: null }),
    ]);
  });

  /**
   * グループを作成し、初期グループ管理者を設定すること
   */
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

  /**
   * 初期管理者がテナント外の場合にエラーを返すこと
   */
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

  /**
   * テナント管理者がメンバーを追加できること
   */
  it('allows a tenant admin to add a member', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne.mockResolvedValueOnce(null);
    usersService.findByIdAndTenant.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
    });

    const out = await service.addMember(
      'group-1',
      { userId: 'user-1', role: GroupMemberRole.USER },
      systemAdmin,
    );

    expect(out.user.email).toBe('user@example.com');
    expect(membersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'user-1',
        invitedByUserId: 'sys-1',
      }),
    );
  });

  /**
   * 非テナント管理者がメンバーを追加できないこと
   */
  it('rejects adding members by non tenant admins', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });

    await expect(
      service.addMember(
        'group-1',
        { userId: 'user-2', role: GroupMemberRole.USER },
        groupAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });
  });

  /**
   * 最後のグループ管理者が降格されないように保護すること
   */
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

  /**
   * グループ管理者がメンバーを削除できること
   */
  it('allows a group admin to remove a group member', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne
      .mockResolvedValueOnce({ userId: 'admin-1', role: GroupMemberRole.ADMIN })
      .mockResolvedValueOnce({
        id: 'member-2',
        userId: 'user-2',
        role: GroupMemberRole.USER,
      });

    await service.removeMember('group-1', 'user-2', groupAdmin);

    expect(membersRepo.delete).toHaveBeenCalledWith('member-2');
  });

  /**
   * 非グループ管理者がメンバーを削除できないこと
   */
  it('rejects removing members by non group admins', async () => {
    groupsRepo.findOne.mockResolvedValue({ id: 'group-1' });
    membersRepo.findOne.mockResolvedValue(null);

    await expect(
      service.removeMember('group-1', 'user-2', {
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'tenant-1',
        roles: [UserRole.TENANT_USER],
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });

    expect(membersRepo.delete).not.toHaveBeenCalled();
  });
});
