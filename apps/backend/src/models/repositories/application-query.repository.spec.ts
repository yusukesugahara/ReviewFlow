import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import type { ApprovalFlow } from '../entities/approval-flow.entity';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApplicationQueryRepository } from './application-query.repository';

type ApplicationListQueryBuilderMock = {
  andWhere: jest.Mock;
  getCount: jest.Mock;
  getMany: jest.Mock;
  getManyAndCount: jest.Mock;
  leftJoinAndMapOne: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  where: jest.Mock;
};

const step = (
  stepOrder: number,
  overrides: Partial<ApprovalStep> = {},
): ApprovalStep =>
  ({
    id: `step-${stepOrder}`,
    stepOrder,
    ...overrides,
  }) as ApprovalStep;

function createListQueryBuilderMock(): ApplicationListQueryBuilderMock {
  const builder: ApplicationListQueryBuilderMock = {
    andWhere: jest.fn(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    leftJoinAndMapOne: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    where: jest.fn(),
  };
  builder.andWhere.mockReturnValue(builder);
  builder.leftJoinAndMapOne.mockReturnValue(builder);
  builder.leftJoinAndSelect.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.skip.mockReturnValue(builder);
  builder.take.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

describe('ApplicationQueryRepository', () => {
  let repository: ApplicationQueryRepository;
  let apps: jest.Mocked<
    Pick<Repository<Application>, 'createQueryBuilder' | 'findOne'>
  >;
  let approvals: jest.Mocked<Pick<Repository<ApplicationApproval>, 'count'>>;
  let builder: ApplicationListQueryBuilderMock;

  beforeEach(async () => {
    builder = createListQueryBuilderMock();
    apps = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
      findOne: jest.fn(),
    };
    approvals = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationQueryRepository,
        { provide: getRepositoryToken(Application), useValue: apps },
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
        },
      ],
    }).compile();

    repository = module.get(ApplicationQueryRepository);
  });

  it('loads detailed applications with expected relations', async () => {
    apps.findOne.mockResolvedValue(null);

    await repository.findByIdInTenant({
      tenantId: 'tenant-1',
      id: 'app-1',
      detail: true,
    });

    expect(apps.findOne).toHaveBeenCalledWith({
      where: { id: 'app-1', tenantId: 'tenant-1' },
      relations: [
        'fieldValues',
        'fieldValues.formField',
        'formDefinition',
        'approvalFlow',
        'approvalFlow.steps',
      ],
    });
  });

  it('sorts approval flow steps when loading applications', async () => {
    const row = {
      id: 'app-1',
      currentStepOrder: 1,
      approvalFlow: {
        steps: [step(2), step(1)],
      } as ApprovalFlow,
    } as Application;
    apps.findOne.mockResolvedValue(row);

    await expect(
      repository.findByIdInTenant({
        tenantId: 'tenant-1',
        id: 'app-1',
        detail: false,
      }),
    ).resolves.toBe(row);

    expect(
      row.approvalFlow.steps.map((approvalStep) => approvalStep.id),
    ).toEqual(['step-1', 'step-2']);
    expect(row.currentApprovalStep?.id).toBe('step-1');
  });

  it('locks an application row before loading detailed relations for update', async () => {
    const locked = { id: 'app-1' } as Application;
    const row = {
      id: 'app-1',
      currentStepOrder: 1,
      approvalFlow: {
        steps: [step(1)],
      } as ApprovalFlow,
    } as Application;
    const managerRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(locked)
        .mockResolvedValueOnce(row),
    };
    const getRepository = jest.fn().mockReturnValue(managerRepo);
    const manager = {
      getRepository,
    } as unknown as EntityManager;

    await expect(
      repository.findByIdInTenant(
        {
          tenantId: 'tenant-1',
          id: 'app-1',
          detail: true,
        },
        manager,
      ),
    ).resolves.toBe(row);

    expect(getRepository).toHaveBeenCalledWith(Application);
    expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 'app-1', tenantId: 'tenant-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(managerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { id: 'app-1', tenantId: 'tenant-1' },
      relations: [
        'fieldValues',
        'fieldValues.formField',
        'formDefinition',
        'approvalFlow',
        'approvalFlow.steps',
      ],
    });
  });

  it('does not load relations when the locked application row is missing', async () => {
    const managerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepo),
    } as unknown as EntityManager;

    await expect(
      repository.findByIdInTenant(
        {
          tenantId: 'tenant-1',
          id: 'missing-app',
          detail: true,
        },
        manager,
      ),
    ).resolves.toBeNull();

    expect(managerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(managerRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'missing-app', tenantId: 'tenant-1' },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('lists applications with form definition and current step mapped by the repository', async () => {
    const rows = [
      {
        id: 'app-1',
        currentStepOrder: 1,
        currentApprovalStep: step(1),
      },
    ] as Application[];
    builder.getMany.mockResolvedValue(rows);

    await expect(repository.listForGroup('tenant-1', 'group-1')).resolves.toBe(
      rows,
    );

    expect(apps.createQueryBuilder).toHaveBeenCalledWith('app');
    expect(builder.leftJoinAndSelect).toHaveBeenCalledWith(
      'app.formDefinition',
      'formDefinition',
    );
    expect(builder.leftJoinAndMapOne).toHaveBeenCalledWith(
      'app.currentApprovalStep',
      ApprovalStep,
      'currentStep',
      expect.stringContaining('currentStep.stepOrder = app.currentStepOrder'),
    );
    expect(builder.where).toHaveBeenCalledWith('app.tenantId = :tenantId', {
      tenantId: 'tenant-1',
    });
    expect(builder.andWhere).toHaveBeenCalledWith('app.groupId = :groupId', {
      groupId: 'group-1',
    });
    expect(builder.orderBy).toHaveBeenCalledWith('app.createdAt', 'DESC');
  });

  it('loads tenant admin application pages at the database level', async () => {
    const rows = [
      {
        id: 'app-1',
        currentStepOrder: 1,
        currentApprovalStep: step(1),
      },
    ] as Application[];
    builder.getManyAndCount.mockResolvedValue([rows, 3]);

    await expect(
      repository.listForTenantAdminPage('tenant-1', 'group-1', {
        offset: 2,
        limit: 1,
      }),
    ).resolves.toEqual({
      nodes: rows,
      offset: 2,
      totalCount: 3,
    });

    expect(builder.skip).toHaveBeenCalledWith(2);
    expect(builder.take).toHaveBeenCalledWith(1);
    expect(builder.getManyAndCount).toHaveBeenCalled();
  });

  it('applies actor visibility before loading a database page', async () => {
    builder.getManyAndCount.mockResolvedValue([[], 0]);

    await repository.listVisibleForActorPage(
      {
        actorId: 'user-1',
        canManageGroup: true,
        groupId: 'group-1',
        tenantId: 'tenant-1',
      },
      { offset: 0, limit: 20 },
    );

    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('app.applicantUserId = :actorId'),
      expect.objectContaining({
        actorId: 'user-1',
        actorIdJsonPattern: '%"user-1"%',
        setupStatuses: ['draft', 'published'],
      }),
    );
    expect(builder.skip).toHaveBeenCalledWith(0);
    expect(builder.take).toHaveBeenCalledWith(20);
  });

  it('counts matching rows without loading entities for first zero pages', async () => {
    builder.getCount.mockResolvedValue(4);

    await expect(
      repository.listForTenantAdminPage('tenant-1', 'group-1', {
        offset: 0,
        limit: 0,
      }),
    ).resolves.toEqual({
      nodes: [],
      offset: 0,
      totalCount: 4,
    });

    expect(builder.getCount).toHaveBeenCalled();
    expect(builder.getManyAndCount).not.toHaveBeenCalled();
  });

  it('finds applicant editable applications by user id when available', async () => {
    apps.findOne.mockResolvedValue(null);

    await repository.findApplicantEditable({
      tenantId: 'tenant-1',
      id: 'app-1',
      applicantUserId: 'user-1',
      applicantEmail: 'user@example.com',
    });

    expect(apps.findOne).toHaveBeenCalledWith({
      where: {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: 'user-1',
      },
      relations: ['fieldValues'],
    });
  });

  it('locks applicant editable applications by applicant user id', async () => {
    const row = { id: 'app-1' } as Application;
    const managerRepo = {
      findOne: jest.fn().mockResolvedValue(row),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepo),
    } as unknown as EntityManager;

    await expect(
      repository.findApplicantEditable(
        {
          tenantId: 'tenant-1',
          id: 'app-1',
          applicantUserId: 'user-1',
          applicantEmail: 'user@example.com',
        },
        manager,
      ),
    ).resolves.toBe(row);

    expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: 'user-1',
      },
      lock: { mode: 'pessimistic_write' },
    });
    expect(managerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: 'user-1',
      },
      relations: ['fieldValues'],
    });
  });
});
