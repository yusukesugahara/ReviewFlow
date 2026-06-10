import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';
import { ApplicationsRepository } from './applications.repository';

describe('ApplicationsRepository', () => {
  let repository: ApplicationsRepository;
  let approvals: jest.Mocked<
    Pick<Repository<ApplicationApproval>, 'count' | 'find'>
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
    approvals = { count: jest.fn(), find: jest.fn() };
    correctionRequests = { find: jest.fn(), findOne: jest.fn() };
    templates = { find: jest.fn(), findOne: jest.fn() };
    approvalFlows = { find: jest.fn(), findOne: jest.fn() };
    users = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsRepository,
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
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

  it('finds open correction requests with items', async () => {
    correctionRequests.findOne.mockResolvedValue(null);

    await repository.findOpenCorrection('app-1');

    expect(correctionRequests.findOne).toHaveBeenCalledWith({
      where: {
        applicationId: 'app-1',
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
  });
});
