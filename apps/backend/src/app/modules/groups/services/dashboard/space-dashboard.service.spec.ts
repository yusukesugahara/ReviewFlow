import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../../../models/constants/group-member-role';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Group } from '../../../../../models/entities/group.entity';
import type {
  SpaceDashboardAggregate,
  SpaceDashboardRepository,
} from '../../../../../models/repositories/space-dashboard.repository';
import type { GroupsService } from '../facades/groups.service';
import { SpaceDashboardService } from './space-dashboard.service';

describe('SpaceDashboardService', () => {
  let groupsService: jest.Mocked<Pick<GroupsService, 'list'>>;
  let dashboardRepository: jest.Mocked<
    Pick<SpaceDashboardRepository, 'getDashboardAggregates'>
  >;
  let service: SpaceDashboardService;

  beforeEach(() => {
    groupsService = {
      list: jest.fn(),
    };
    dashboardRepository = {
      getDashboardAggregates: jest.fn(),
    };
    service = new SpaceDashboardService(
      groupsService as unknown as GroupsService,
      dashboardRepository as unknown as SpaceDashboardRepository,
    );
  });

  it('returns dashboard summaries for visible spaces', async () => {
    const latest = new Date('2026-06-16T01:23:45.000Z');
    groupsService.list.mockResolvedValue([
      group({
        id: 'group-a',
        name: 'Aスペース',
        description: '',
        currentUserRole: GroupMemberRole.ADMIN,
      }),
      group({
        id: 'group-b',
        name: 'Bスペース',
        description: '説明',
        currentUserRole: GroupMemberRole.USER,
      }),
    ]);
    dashboardRepository.getDashboardAggregates.mockResolvedValue([
      aggregate({
        groupId: 'group-a',
        memberCount: 3,
        formCount: 2,
        publishedFormCount: 1,
        totalApplications: 4,
        needsActionCount: 2,
        returnedCount: 1,
        approvedCount: 1,
        rejectedCount: 0,
        correctionCount: 3,
        resubmitCount: 1,
        latestApplicationAt: latest,
      }),
      aggregate({
        groupId: 'group-b',
        totalApplications: 0,
      }),
    ]);

    await expect(service.list(actor())).resolves.toEqual([
      {
        id: 'group-a',
        name: 'Aスペース',
        description: null,
        currentUserRole: GroupMemberRole.ADMIN,
        memberCount: 3,
        formCount: 2,
        publishedFormCount: 1,
        totalApplications: 4,
        needsActionCount: 2,
        returnedCount: 1,
        approvedCount: 1,
        rejectedCount: 0,
        correctionCount: 3,
        resubmitCount: 1,
        avgReturns: '0.75',
        latestApplicationAt: latest.toISOString(),
      },
      expect.objectContaining({
        id: 'group-b',
        description: '説明',
        currentUserRole: GroupMemberRole.USER,
        avgReturns: '0.00',
        latestApplicationAt: null,
      }),
    ]);
    expect(dashboardRepository.getDashboardAggregates).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupIds: ['group-a', 'group-b'],
      actorId: 'user-1',
      canReadAllApplications: false,
      manageableGroupIds: ['group-a'],
    });
  });

  it('allows tenant admins to aggregate all visible spaces', async () => {
    groupsService.list.mockResolvedValue([
      group({ id: 'group-a', currentUserRole: null }),
      group({ id: 'group-b', currentUserRole: GroupMemberRole.ADMIN }),
    ]);
    dashboardRepository.getDashboardAggregates.mockResolvedValue([
      aggregate({ groupId: 'group-a' }),
      aggregate({ groupId: 'group-b' }),
    ]);

    await service.list(actor({ roles: [UserRole.TENANT_ADMIN] }));

    expect(dashboardRepository.getDashboardAggregates).toHaveBeenCalledWith(
      expect.objectContaining({
        canReadAllApplications: true,
        manageableGroupIds: ['group-a', 'group-b'],
      }),
    );
  });

  it('returns an empty list without querying aggregates when no spaces are visible', async () => {
    groupsService.list.mockResolvedValue([]);

    await expect(service.list(actor())).resolves.toEqual([]);

    expect(dashboardRepository.getDashboardAggregates).not.toHaveBeenCalled();
  });
});

function actor(overrides: Partial<AuthUserPayload> = {}): AuthUserPayload {
  return {
    id: 'user-1',
    email: 'user@example.com',
    tenantId: 'tenant-1',
    roles: [UserRole.TENANT_USER],
    ...overrides,
  };
}

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-a',
    tenantId: 'tenant-1',
    name: 'スペース',
    description: null,
    createdByUserId: 'creator-1',
    currentUserRole: GroupMemberRole.USER,
    createdAt: new Date('2026-06-15T00:00:00.000Z'),
    updatedAt: new Date('2026-06-15T00:00:00.000Z'),
    ...overrides,
  } as Group;
}

function aggregate(
  overrides: Partial<SpaceDashboardAggregate> = {},
): SpaceDashboardAggregate {
  return {
    groupId: 'group-a',
    memberCount: 0,
    formCount: 0,
    publishedFormCount: 0,
    totalApplications: 0,
    needsActionCount: 0,
    returnedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    correctionCount: 0,
    resubmitCount: 0,
    latestApplicationAt: null,
    ...overrides,
  };
}
