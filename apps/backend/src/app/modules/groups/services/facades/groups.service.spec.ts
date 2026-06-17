import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClientErrorCodes } from '../../../../../common/errors';
import { GroupMemberRole } from '../../../../../models/constants/group-member-role';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupMember } from '../../../../../models/entities/group-member.entity';
import { Group } from '../../../../../models/entities/group.entity';
import { User } from '../../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';
import { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import { UsersService } from '../../../users/services/users.service';
import type { TransactionManager } from '../../../../transaction';
import { GroupMembersService } from '../members/group-members.service';
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
      | 'findGroupsByMembershipForUser'
      | 'findGroupsByTenantWithCurrentUserRole'
      | 'findGroupByTenantAndName'
      | 'findGroupByIdInTenant'
      | 'createGroupWithAdmins'
      | 'saveGroup'
      | 'deleteGroup'
    >
  >;
  let usersService: {
    countByIdsInTenant: jest.Mock;
  };
  let groupMembers: jest.Mocked<
    Pick<
      GroupMembersService,
      | 'listMembers'
      | 'listAvailableUsers'
      | 'addMember'
      | 'updateMemberRole'
      | 'removeMember'
      | 'leave'
    >
  >;
  let auditLogs: {
    recordSpaceEvent: jest.Mock;
  };
  let transactionManager: TransactionManager;
  let dataSource: {
    transaction: jest.Mock;
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
      findGroupsByMembershipForUser: jest.fn(),
      findGroupsByTenantWithCurrentUserRole: jest.fn(),
      findGroupByTenantAndName: jest.fn(),
      findGroupByIdInTenant: jest.fn(),
      createGroupWithAdmins: jest.fn(),
      saveGroup: jest.fn(),
      deleteGroup: jest.fn(),
    };
    usersService = {
      countByIdsInTenant: jest.fn(),
    };
    groupMembers = {
      listMembers: jest.fn(),
      listAvailableUsers: jest.fn(),
      addMember: jest.fn(),
      updateMemberRole: jest.fn(),
      removeMember: jest.fn(),
      leave: jest.fn(),
    };
    auditLogs = {
      recordSpaceEvent: jest.fn(),
    };
    transactionManager = {} as TransactionManager;
    dataSource = {
      transaction: jest.fn(
        <T>(work: (manager: TransactionManager) => Promise<T>) =>
          work(transactionManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GroupsRepository, useValue: groupsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: GroupMembersService, useValue: groupMembers },
        { provide: BusinessAuditLogService, useValue: auditLogs },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(GroupsService);
  });

  it('returns current user space roles independently per group', async () => {
    groupsRepository.findGroupsByMembershipForUser.mockResolvedValue([
      group({
        id: 'group-a',
        name: 'Aスペース',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      group({
        id: 'group-b',
        name: 'Bスペース',
        currentUserRole: GroupMemberRole.USER,
      }),
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
    expect(groupsRepository.findGroupsByMembershipForUser).toHaveBeenCalledWith(
      'tenant-1',
      'admin-1',
    );
  });

  it('returns tenant admin groups with membership role when present', async () => {
    groupsRepository.findGroupsByTenantWithCurrentUserRole.mockResolvedValue([
      group({
        id: 'group-a',
        name: 'Aスペース',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      group({ id: 'group-b', name: 'Bスペース', currentUserRole: null }),
    ]);

    const out = await service.list(systemAdmin);

    expect(out).toEqual([
      expect.objectContaining({
        id: 'group-a',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      expect.objectContaining({ id: 'group-b', currentUserRole: null }),
    ]);
    expect(
      groupsRepository.findGroupsByTenantWithCurrentUserRole,
    ).toHaveBeenCalledWith('tenant-1', 'sys-1');
  });

  it('creates a group with initial group admins', async () => {
    const createdGroup = group({
      id: 'group-1',
      name: 'Team A',
      createdByUserId: 'sys-1',
    });
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(null);
    groupsRepository.createGroupWithAdmins.mockResolvedValue(createdGroup);
    usersService.countByIdsInTenant.mockResolvedValue(2);

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
      transactionManager,
    );
    expect(auditLogs.recordSpaceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'space.created',
        actor: systemAdmin,
        group: createdGroup,
      }),
      transactionManager,
    );
  });

  it('rejects initial admins outside the tenant', async () => {
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(null);
    usersService.countByIdsInTenant.mockResolvedValue(1);

    await expect(
      service.create(
        { name: 'Team A', adminUserIds: ['admin-1', 'missing-user'] },
        systemAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
    });
  });

  it('removes a tenant-scoped group', async () => {
    const targetGroup = group({ id: 'group-1' });
    groupsRepository.findGroupByIdInTenant.mockResolvedValue(targetGroup);

    await service.remove('group-1', systemAdmin);

    expect(groupsRepository.deleteGroup).toHaveBeenCalledWith(
      'group-1',
      transactionManager,
    );
    expect(auditLogs.recordSpaceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'space.deleted',
        actor: systemAdmin,
        group: targetGroup,
      }),
      transactionManager,
    );
  });

  it('updates a tenant-scoped group and records an audit log', async () => {
    const targetGroup = group({
      id: 'group-1',
      name: 'Before',
      description: 'Old description',
    });
    const savedGroup = group({
      id: 'group-1',
      name: 'After',
      description: 'New description',
    });
    groupsRepository.findGroupByIdInTenant.mockResolvedValue(targetGroup);
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(null);
    groupsRepository.saveGroup.mockResolvedValue(savedGroup);

    const out = await service.update(
      'group-1',
      { name: ' After ', description: ' New description ' },
      systemAdmin,
    );

    expect(out).toBe(savedGroup);
    expect(groupsRepository.saveGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'group-1',
        name: 'After',
        description: 'New description',
      }),
      transactionManager,
    );
    expect(auditLogs.recordSpaceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'space.updated',
        actor: systemAdmin,
        group: savedGroup,
        metadataJson: {
          nameFrom: 'Before',
          nameTo: 'After',
          descriptionFrom: 'Old description',
          descriptionTo: 'New description',
        },
      }),
      transactionManager,
    );
  });

  it('rejects group updates with duplicate names in the tenant', async () => {
    groupsRepository.findGroupByIdInTenant.mockResolvedValue(
      group({ id: 'group-1', name: 'Before' }),
    );
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(
      group({ id: 'group-2', name: 'After' }),
    );

    await expect(
      service.update('group-1', { name: 'After' }, systemAdmin),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_NAME_EXISTS,
    });

    expect(groupsRepository.saveGroup).not.toHaveBeenCalled();
    expect(auditLogs.recordSpaceEvent).not.toHaveBeenCalled();
  });

  it('skips persistence when group details are unchanged', async () => {
    const targetGroup = group({
      id: 'group-1',
      name: 'Team A',
      description: 'Description',
    });
    groupsRepository.findGroupByIdInTenant.mockResolvedValue(targetGroup);
    groupsRepository.findGroupByTenantAndName.mockResolvedValue(targetGroup);

    const out = await service.update(
      'group-1',
      { name: ' Team A ', description: ' Description ' },
      systemAdmin,
    );

    expect(out).toBe(targetGroup);
    expect(groupsRepository.saveGroup).not.toHaveBeenCalled();
    expect(auditLogs.recordSpaceEvent).not.toHaveBeenCalled();
  });

  it('delegates member operations to GroupMembersService', async () => {
    const member = groupMember({ id: 'member-1' });
    const availableUsers = [user({ id: 'user-2' })];
    groupMembers.listMembers.mockResolvedValue([member]);
    groupMembers.listAvailableUsers.mockResolvedValue(availableUsers);
    groupMembers.addMember.mockResolvedValue(member);
    groupMembers.updateMemberRole.mockResolvedValue(member);

    await expect(service.listMembers('group-1', groupAdmin)).resolves.toEqual([
      member,
    ]);
    await expect(
      service.listAvailableUsers('group-1', groupAdmin),
    ).resolves.toEqual(availableUsers);
    await expect(
      service.addMember(
        'group-1',
        { userId: 'user-1', role: GroupMemberRole.USER },
        systemAdmin,
      ),
    ).resolves.toBe(member);
    await expect(
      service.updateMemberRole(
        'group-1',
        'user-1',
        { role: GroupMemberRole.ADMIN },
        groupAdmin,
      ),
    ).resolves.toBe(member);
    await service.removeMember('group-1', 'user-1', groupAdmin);
    await service.leave('group-1', groupAdmin);

    expect(groupMembers.removeMember).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      groupAdmin,
    );
    expect(groupMembers.leave).toHaveBeenCalledWith('group-1', groupAdmin);
  });
});

function group(overrides: Partial<Group> = {}): Group {
  const date = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'group-1',
    tenantId: 'tenant-1',
    name: 'Team A',
    description: null,
    createdByUserId: 'sys-1',
    createdAt: date,
    updatedAt: date,
    ...overrides,
  } as Group;
}

function groupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    userId: 'user-1',
    role: GroupMemberRole.USER,
    invitedByUserId: 'sys-1',
    user: user({ id: 'user-1' }),
    ...overrides,
  } as GroupMember;
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    name: null,
    ...overrides,
  } as User;
}
