import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { GroupMemberRole } from '../../../../models/constants/group-member-role';
import { UserRole } from '../../../../models/constants/user-role';
import { GroupMember } from '../../../../models/entities/group-member.entity';
import { Group } from '../../../../models/entities/group.entity';
import { User } from '../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../models/repositories/groups.repository';
import { UsersService } from '../../users/services/users.service';
import { GroupsService } from './groups.service';

/**
 * GroupsService のテスト
 *
 * @group groups-service
 */
describe('GroupsService', () => {
  let service: GroupsService;
  let groupsRepository: jest.Mocked<
    Pick<
      GroupsRepository,
      | 'findGroupsByTenant'
      | 'findMembershipsByTenantAndUser'
      | 'findMembershipsWithGroupsByTenantAndUser'
      | 'findGroupByTenantAndName'
      | 'findGroupByIdInTenant'
      | 'createGroupWithAdmins'
      | 'findMember'
      | 'findAdminMember'
      | 'createMember'
      | 'saveMember'
      | 'deleteMember'
      | 'findAdmins'
    >
  >;
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
    groupsRepository = {
      findGroupsByTenant: jest.fn(),
      findMembershipsByTenantAndUser: jest.fn(),
      findMembershipsWithGroupsByTenantAndUser: jest.fn(),
      findGroupByTenantAndName: jest.fn(),
      findGroupByIdInTenant: jest.fn(),
      createGroupWithAdmins: jest.fn(),
      findMember: jest.fn(),
      findAdminMember: jest.fn(),
      createMember: jest.fn(),
      saveMember: jest.fn(),
      deleteMember: jest.fn(),
      findAdmins: jest.fn(),
    };
    usersService = {
      findAllByIdsInTenant: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GroupsRepository, useValue: groupsRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get(GroupsService);
  });

  /**
   * 現在のユーザーのスペースロールをグループごとに独立して返すこと
   */
  it('returns current user space roles independently per group', async () => {
    groupsRepository.findMembershipsWithGroupsByTenantAndUser.mockResolvedValue(
      [
        {
          role: GroupMemberRole.ADMIN,
          group: { id: 'group-a', name: 'Aスペース' },
        },
        {
          role: GroupMemberRole.USER,
          group: { id: 'group-b', name: 'Bスペース' },
        },
      ] as GroupMember[],
    );

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
    groupsRepository.findGroupsByTenant.mockResolvedValue([
      { id: 'group-a', name: 'Aスペース' },
      { id: 'group-b', name: 'Bスペース' },
    ] as Group[]);
    groupsRepository.findMembershipsByTenantAndUser.mockResolvedValue([
      { groupId: 'group-a', role: GroupMemberRole.ADMIN },
    ] as GroupMember[]);

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
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(null);
    groupsRepository.createGroupWithAdmins.mockResolvedValue({
      id: 'group-1',
      tenantId: 'tenant-1',
      name: 'Team A',
      createdByUserId: 'sys-1',
    } as Group);
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
    expect(groupsRepository.createGroupWithAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Team A',
        createdByUserId: 'sys-1',
        adminUserIds: ['admin-1', 'admin-2'],
      }),
    );
  });

  /**
   * 初期管理者がテナント外の場合にエラーを返すこと
   */
  it('rejects initial admins outside the tenant', async () => {
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(null);
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
    groupsRepository.findGroupByIdInTenant.mockResolvedValue({
      id: 'group-1',
    } as Group);
    groupsRepository.findMember.mockResolvedValueOnce(null);
    usersService.findByIdAndTenant.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
    });
    groupsRepository.createMember.mockResolvedValue({
      groupId: 'group-1',
      userId: 'user-1',
      invitedByUserId: 'sys-1',
    } as GroupMember);

    const out = await service.addMember(
      'group-1',
      { userId: 'user-1', role: GroupMemberRole.USER },
      systemAdmin,
    );

    expect(out.user.email).toBe('user@example.com');
    expect(groupsRepository.createMember).toHaveBeenCalledWith(
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
    groupsRepository.findGroupByIdInTenant.mockResolvedValue({
      id: 'group-1',
    } as Group);

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
    groupsRepository.findGroupByIdInTenant.mockResolvedValue({
      id: 'group-1',
    } as Group);
    groupsRepository.findAdminMember.mockResolvedValue({
      userId: 'admin-1',
      role: GroupMemberRole.ADMIN,
    } as GroupMember);
    groupsRepository.findMember.mockResolvedValue({
      id: 'member-1',
      userId: 'admin-1',
      role: GroupMemberRole.ADMIN,
    } as GroupMember);
    groupsRepository.findAdmins.mockResolvedValue([
      { userId: 'admin-1', role: GroupMemberRole.ADMIN },
    ] as GroupMember[]);

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
    groupsRepository.findGroupByIdInTenant.mockResolvedValue({
      id: 'group-1',
    } as Group);
    groupsRepository.findAdminMember.mockResolvedValue({
      userId: 'admin-1',
      role: GroupMemberRole.ADMIN,
    } as GroupMember);
    groupsRepository.findMember.mockResolvedValue({
      id: 'member-2',
      userId: 'user-2',
      role: GroupMemberRole.USER,
    } as GroupMember);

    await service.removeMember('group-1', 'user-2', groupAdmin);

    expect(groupsRepository.deleteMember).toHaveBeenCalledWith('member-2');
  });

  /**
   * 非グループ管理者がメンバーを削除できないこと
   */
  it('rejects removing members by non group admins', async () => {
    groupsRepository.findGroupByIdInTenant.mockResolvedValue({
      id: 'group-1',
    } as Group);
    groupsRepository.findAdminMember.mockResolvedValue(null);

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

    expect(groupsRepository.deleteMember).not.toHaveBeenCalled();
  });
});
