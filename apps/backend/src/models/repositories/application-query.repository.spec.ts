import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import type { ApprovalFlow } from '../entities/approval-flow.entity';
import type { ApprovalStep } from '../entities/approval-step.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { ApplicationQueryRepository } from './application-query.repository';

const step = (
  stepOrder: number,
  overrides: Partial<ApprovalStep> = {},
): ApprovalStep =>
  ({
    id: `step-${stepOrder}`,
    stepOrder,
    ...overrides,
  }) as ApprovalStep;

describe('ApplicationQueryRepository', () => {
  let repository: ApplicationQueryRepository;
  let apps: jest.Mocked<Pick<Repository<Application>, 'find' | 'findOne'>>;
  let approvals: jest.Mocked<Pick<Repository<ApplicationApproval>, 'count'>>;
  let templates: jest.Mocked<Pick<Repository<FormDefinition>, 'find'>>;

  beforeEach(async () => {
    apps = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    approvals = { count: jest.fn() };
    templates = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationQueryRepository,
        { provide: getRepositoryToken(Application), useValue: apps },
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
        },
        { provide: getRepositoryToken(FormDefinition), useValue: templates },
      ],
    }).compile();

    repository = module.get(ApplicationQueryRepository);
  });

  it('loads detailed applications with expected relations', async () => {
    apps.findOne.mockResolvedValue(null);

    await repository.findById({
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
      approvalFlow: {
        steps: [step(2), step(1)],
      } as ApprovalFlow,
    } as Application;
    apps.findOne.mockResolvedValue(row);

    await expect(
      repository.findById({
        tenantId: 'tenant-1',
        id: 'app-1',
        detail: false,
      }),
    ).resolves.toBe(row);

    expect(
      row.approvalFlow.steps.map((approvalStep) => approvalStep.id),
    ).toEqual(['step-1', 'step-2']);
  });

  it('hydrates missing form definitions by tenant', async () => {
    const existingDefinition = { id: 'template-existing' } as FormDefinition;
    const missingDefinition = { id: 'template-missing' } as FormDefinition;
    const rows = [
      {
        id: 'app-existing',
        formDefinitionId: 'template-existing',
        formDefinition: existingDefinition,
      },
      {
        id: 'app-missing',
        formDefinitionId: 'template-missing',
      },
    ] as Application[];
    templates.find.mockResolvedValue([missingDefinition]);

    await expect(
      repository.hydrateFormDefinitions('tenant-1', rows),
    ).resolves.toBe(rows);

    expect(templates.find).toHaveBeenCalledTimes(1);
    expect(rows[1]?.formDefinition).toBe(missingDefinition);
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
});
