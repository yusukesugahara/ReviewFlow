import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { GroupMemberRole } from '../../../../../models/constants/group-member-role';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupMember } from '../../../../../models/entities/group-member.entity';
import { User } from '../../../../../models/entities/user.entity';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';
import { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import { UsersService } from '../../../users/services/users.service';
import { GroupMembersService } from './group-members.service';
import { SpaceAccessService } from '../access/space-access.service';

describe('GroupMembersService', () => {
  let service: GroupMembersService;
  let groupsRepository: jest.Mocked<
    Pick<
      GroupsRepository,
      | 'findMembersWithUsers'
      | 'findAvailableUsersForGroup'
      | 'findMember'
      | 'createMember'
      | 'saveMember'
      | 'deleteMember'
      | 'findAdmins'
    >
  >;
  let usersService: {
    findByIdAndTenant: jest.Mock;
  };
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertGroupInTenant' | 'assertCanManageGroup'>
  >;
  let auditLogs: {
    recordSpaceMemberEvent: jest.Mock;
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
      findMembersWithUsers: jest.fn(),
      findAvailableUsersForGroup: jest.fn(),
      findMember: jest.fn(),
      createMember: jest.fn(),
      saveMember: jest.fn(),
      deleteMember: jest.fn(),
      findAdmins: jest.fn(),
    };
    usersService = {
      findByIdAndTenant: jest.fn(),
    };
    spaceAccess = {
      assertGroupInTenant: jest.fn().mockResolvedValue(undefined),
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };
    auditLogs = {
      recordSpaceMemberEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMembersService,
        { provide: GroupsRepository, useValue: groupsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SpaceAccessService, useValue: spaceAccess },
        { provide: BusinessAuditLogService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get(GroupMembersService);
  });

  it('listMembers requires group management access', async () => {
    const members = [groupMember({ id: 'member-1' })];
    groupsRepository.findMembersWithUsers.mockResolvedValue(members);

    const out = await service.listMembers('group-1', groupAdmin);

    expect(out).toBe(members);
    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(
      groupAdmin,
      'group-1',
    );
    expect(groupsRepository.findMembersWithUsers).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
  });

  it('listAvailableUsers loads non-member users through the repository', async () => {
    groupsRepository.findAvailableUsersForGroup.mockResolvedValue([
      user({ id: 'user-2' }),
    ]);

    const out = await service.listAvailableUsers('group-1', groupAdmin);

    expect(out.map((row) => row.id)).toEqual(['user-2']);
    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(
      groupAdmin,
      'group-1',
    );
    expect(groupsRepository.findAvailableUsersForGroup).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
  });

  it('allows a tenant admin to add a member', async () => {
    groupsRepository.findMember.mockResolvedValueOnce(null);
    usersService.findByIdAndTenant.mockResolvedValue(
      user({ id: 'user-1', email: 'user@example.com' }),
    );
    groupsRepository.createMember.mockResolvedValue(
      groupMember({ groupId: 'group-1', userId: 'user-1' }),
    );

    const out = await service.addMember(
      'group-1',
      { userId: 'user-1', role: GroupMemberRole.USER },
      systemAdmin,
    );

    expect(out.user.email).toBe('user@example.com');
    expect(spaceAccess.assertGroupInTenant).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
    expect(groupsRepository.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'user-1',
        invitedByUserId: 'sys-1',
      }),
    );
    expect(auditLogs.recordSpaceMemberEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'space.member_added',
        actor: systemAdmin,
        member: out,
        groupRoleTo: GroupMemberRole.USER,
      }),
    );
  });

  it('rejects adding members by non tenant admins', async () => {
    await expect(
      service.addMember(
        'group-1',
        { userId: 'user-2', role: GroupMemberRole.USER },
        groupAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });
    expect(groupsRepository.createMember).not.toHaveBeenCalled();
  });

  it('rejects duplicate group members', async () => {
    usersService.findByIdAndTenant.mockResolvedValue(user({ id: 'user-1' }));
    groupsRepository.findMember.mockResolvedValue(groupMember());

    await expect(
      service.addMember(
        'group-1',
        { userId: 'user-1', role: GroupMemberRole.USER },
        systemAdmin,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_MEMBER_EXISTS,
    });
  });

  it('protects the last group admin from demotion', async () => {
    groupsRepository.findMember.mockResolvedValue(
      groupMember({
        id: 'member-1',
        userId: 'admin-1',
        role: GroupMemberRole.ADMIN,
      }),
    );
    groupsRepository.findAdmins.mockResolvedValue([
      groupMember({ userId: 'admin-1', role: GroupMemberRole.ADMIN }),
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

  it('allows a group admin to remove a group member', async () => {
    const member = groupMember({
      id: 'member-2',
      userId: 'user-2',
      role: GroupMemberRole.USER,
    });
    groupsRepository.findMember.mockResolvedValue(member);

    await service.removeMember('group-1', 'user-2', groupAdmin);

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(
      groupAdmin,
      'group-1',
    );
    expect(groupsRepository.deleteMember).toHaveBeenCalledWith('member-2');
    expect(auditLogs.recordSpaceMemberEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'space.member_removed',
        actor: groupAdmin,
        member,
        groupRoleFrom: GroupMemberRole.USER,
      }),
    );
  });

  it('rejects removing members by non group admins', async () => {
    spaceAccess.assertCanManageGroup.mockRejectedValue(
      clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED),
    );

    await expect(
      service.removeMember('group-1', 'user-2', groupAdmin),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });
    expect(groupsRepository.deleteMember).not.toHaveBeenCalled();
  });

  it('protects the last group admin from leaving', async () => {
    groupsRepository.findMember.mockResolvedValue(
      groupMember({
        id: 'member-1',
        userId: 'admin-1',
        role: GroupMemberRole.ADMIN,
      }),
    );
    groupsRepository.findAdmins.mockResolvedValue([
      groupMember({ userId: 'admin-1', role: GroupMemberRole.ADMIN }),
    ]);

    await expect(service.leave('group-1', groupAdmin)).rejects.toMatchObject({
      errorCode: ClientErrorCodes.LAST_GROUP_ADMIN_PROTECTED,
    });
  });
});

function groupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    userId: 'user-1',
    role: GroupMemberRole.USER,
    invitedByUserId: 'sys-1',
    user: user({ id: overrides.userId ?? 'user-1' }),
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
