import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';
import { ApplicationsRepository } from './applications.repository';

describe('ApplicationsRepository', () => {
  let repository: ApplicationsRepository;
  let apps: jest.Mocked<
    Pick<Repository<Application>, 'find' | 'findOne' | 'manager'>
  >;
  let approvals: jest.Mocked<
    Pick<Repository<ApplicationApproval>, 'count' | 'find'>
  >;
  let fieldValues: jest.Mocked<
    Pick<Repository<ApplicationFieldValue>, 'find' | 'create'>
  >;
  let correctionRequests: jest.Mocked<
    Pick<Repository<CorrectionRequest>, 'find' | 'findOne'>
  >;
  let templates: jest.Mocked<
    Pick<Repository<FormDefinition>, 'find' | 'findOne'>
  >;
  let approvalFlows: jest.Mocked<
    Pick<Repository<ApprovalFlow>, 'find' | 'findOne'>
  >;
  let users: jest.Mocked<Pick<Repository<User>, 'find'>>;

  beforeEach(async () => {
    apps = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(),
      } as unknown as Repository<Application>['manager'],
    };
    approvals = { count: jest.fn(), find: jest.fn() };
    fieldValues = { find: jest.fn(), create: jest.fn() };
    correctionRequests = { find: jest.fn(), findOne: jest.fn() };
    templates = { find: jest.fn(), findOne: jest.fn() };
    approvalFlows = { find: jest.fn(), findOne: jest.fn() };
    users = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsRepository,
        { provide: getRepositoryToken(Application), useValue: apps },
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
        },
        {
          provide: getRepositoryToken(ApplicationFieldValue),
          useValue: fieldValues,
        },
        {
          provide: getRepositoryToken(CorrectionRequest),
          useValue: correctionRequests,
        },
        { provide: getRepositoryToken(FormDefinition), useValue: templates },
        { provide: getRepositoryToken(ApprovalFlow), useValue: approvalFlows },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    repository = module.get(ApplicationsRepository);
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
});
