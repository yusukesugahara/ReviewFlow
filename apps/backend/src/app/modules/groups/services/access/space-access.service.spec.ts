import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../../common/errors';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupMember } from '../../../../../models/entities/group-member.entity';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';
import { SpaceAccessService } from './space-access.service';

describe('SpaceAccessService', () => {
  let service: SpaceAccessService;
  let groupsRepository: jest.Mocked<
    Pick<
      GroupsRepository,
      'countGroupInTenant' | 'findMember' | 'findAdminMember'
    >
  >;

  const tenantAdmin = {
    id: 'tenant-admin-1',
    email: 'tenant-admin@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_ADMIN],
  };

  const tenantUser = {
    id: 'user-1',
    email: 'user@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_USER],
  };

  beforeEach(async () => {
    groupsRepository = {
      countGroupInTenant: jest.fn().mockResolvedValue(1),
      findMember: jest.fn(),
      findAdminMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceAccessService,
        { provide: GroupsRepository, useValue: groupsRepository },
      ],
    }).compile();

    service = module.get(SpaceAccessService);
  });

  it('rejects a group outside the tenant scope', async () => {
    groupsRepository.countGroupInTenant.mockResolvedValue(0);

    await expect(
      service.assertGroupInTenant('tenant-1', 'group-1'),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_NOT_FOUND,
    });
    expect(groupsRepository.countGroupInTenant).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
  });

  it('allows tenant admins to use a tenant group without membership lookup', async () => {
    await service.assertCanUseGroup(tenantAdmin, 'group-1');

    expect(groupsRepository.countGroupInTenant).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
    expect(groupsRepository.findMember).not.toHaveBeenCalled();
  });

  it('allows group members to use a tenant group', async () => {
    groupsRepository.findMember.mockResolvedValue({
      id: 'member-1',
    } as GroupMember);

    await service.assertCanUseGroup(tenantUser, 'group-1');

    expect(groupsRepository.findMember).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
      'user-1',
    );
  });

  it('rejects non-members from using a tenant group', async () => {
    groupsRepository.findMember.mockResolvedValue(null);

    await expect(
      service.assertCanUseGroup(tenantUser, 'group-1'),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_ACCESS_DENIED,
    });
  });

  it('allows tenant admins to manage a tenant group without admin membership lookup', async () => {
    await service.assertCanManageGroup(tenantAdmin, 'group-1');

    expect(groupsRepository.countGroupInTenant).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
    expect(groupsRepository.findAdminMember).not.toHaveBeenCalled();
  });

  it('allows group admins to manage a tenant group', async () => {
    groupsRepository.findAdminMember.mockResolvedValue({
      id: 'member-1',
    } as GroupMember);

    await service.assertCanManageGroup(tenantUser, 'group-1');

    expect(groupsRepository.findAdminMember).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
      'user-1',
    );
  });

  it('rejects non-admin members from managing a tenant group', async () => {
    groupsRepository.findAdminMember.mockResolvedValue(null);

    await expect(
      service.assertCanManageGroup(tenantUser, 'group-1'),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.GROUP_ADMIN_REQUIRED,
    });
  });

  it('returns whether the actor can manage the group', async () => {
    groupsRepository.findAdminMember
      .mockResolvedValueOnce({ id: 'member-1' } as GroupMember)
      .mockResolvedValueOnce(null);

    await expect(
      service.actorCanManageGroup(tenantAdmin, 'group-1'),
    ).resolves.toBe(true);
    await expect(
      service.actorCanManageGroup(tenantUser, 'group-1'),
    ).resolves.toBe(true);
    await expect(
      service.actorCanManageGroup(tenantUser, 'group-1'),
    ).resolves.toBe(false);
  });
});
