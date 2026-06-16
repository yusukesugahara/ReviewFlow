import type { DataSource } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { SpaceDashboardRepository } from './space-dashboard.repository';

describe('SpaceDashboardRepository', () => {
  let dataSource: {
    query: jest.Mock<Promise<unknown[]>, [string, unknown[]?]>;
  };
  let repository: SpaceDashboardRepository;

  beforeEach(() => {
    dataSource = {
      query: jest.fn<Promise<unknown[]>, [string, unknown[]?]>(),
    };
    repository = new SpaceDashboardRepository(
      dataSource as unknown as DataSource,
    );
  });

  it('merges member, form, and application counts by group id', async () => {
    const latest = new Date('2026-06-16T01:23:45.000Z');
    dataSource.query
      .mockResolvedValueOnce([{ groupId: 'group-a', memberCount: '3' }])
      .mockResolvedValueOnce([
        {
          groupId: 'group-a',
          formCount: '2',
          publishedFormCount: '1',
        },
      ])
      .mockResolvedValueOnce([
        {
          groupId: 'group-a',
          totalApplications: '4',
          needsActionCount: '2',
          returnedCount: '1',
          approvedCount: '1',
          rejectedCount: '0',
          correctionCount: '3',
          resubmitCount: '1',
          latestApplicationAt: latest,
        },
      ]);

    await expect(
      repository.getDashboardAggregates({
        tenantId: 'tenant-1',
        groupIds: ['group-a', 'group-b'],
        actorId: 'user-1',
        canReadAllApplications: false,
        manageableGroupIds: ['group-a'],
      }),
    ).resolves.toEqual([
      {
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
      },
      expect.objectContaining({
        groupId: 'group-b',
        memberCount: 0,
        formCount: 0,
        totalApplications: 0,
        latestApplicationAt: null,
      }),
    ]);
    expect(dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('passes actor visibility parameters to the application aggregate query', async () => {
    dataSource.query.mockResolvedValue([]);

    await repository.getDashboardAggregates({
      tenantId: 'tenant-1',
      groupIds: ['group-a'],
      actorId: 'user-1',
      canReadAllApplications: false,
      manageableGroupIds: ['group-a'],
    });

    const [sql, params] = dataSource.query.mock.calls[2] as [string, unknown[]];
    expect(sql).toContain('WITH visible_applications');
    expect(sql).toContain('current_step.assignee_user_ids::jsonb ? ($3::text)');
    expect(params).toEqual([
      'tenant-1',
      ['group-a'],
      'user-1',
      false,
      [ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED],
      ['group-a'],
      ApplicationStatus.IN_REVIEW,
      [ApplicationStatus.SUBMITTED, ApplicationStatus.IN_REVIEW],
      [ApplicationStatus.RETURNED],
      [ApplicationStatus.APPROVED],
      [ApplicationStatus.REJECTED],
    ]);
  });

  it('does not query when no group ids are provided', async () => {
    await expect(
      repository.getDashboardAggregates({
        tenantId: 'tenant-1',
        groupIds: [],
        actorId: 'user-1',
        canReadAllApplications: false,
        manageableGroupIds: [],
      }),
    ).resolves.toEqual([]);

    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('uses non-archived and published form statuses for form counts', async () => {
    dataSource.query.mockResolvedValue([]);

    await repository.getDashboardAggregates({
      tenantId: 'tenant-1',
      groupIds: ['group-a'],
      actorId: 'user-1',
      canReadAllApplications: true,
      manageableGroupIds: ['group-a'],
    });

    expect(dataSource.query.mock.calls[1][1]).toEqual([
      'tenant-1',
      ['group-a'],
      FormDefinitionStatus.PUBLISHED,
      FormDefinitionStatus.ARCHIVED,
    ]);
  });
});
