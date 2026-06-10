import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { User } from '../entities/user.entity';
import { ApplicationProgressRepository } from './application-progress.repository';

describe('ApplicationProgressRepository', () => {
  let repository: ApplicationProgressRepository;
  let approvals: jest.Mocked<Pick<Repository<ApplicationApproval>, 'find'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'find'>>;

  beforeEach(async () => {
    approvals = { find: jest.fn() };
    users = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationProgressRepository,
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
        },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    repository = module.get(ApplicationProgressRepository);
  });

  it('finds approvals for progress ordered by action time', async () => {
    approvals.find.mockResolvedValue([]);

    await repository.findApprovalsForProgress({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
    });

    expect(approvals.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        applicationId: 'app-1',
      },
      relations: ['actedBy'],
      order: { actedAt: 'ASC' },
    });
  });

  it('finds users by ids within the tenant', async () => {
    users.find.mockResolvedValue([]);

    await repository.findUsersByIdsInTenant('tenant-1', ['user-1', 'user-2']);

    expect(users.find).toHaveBeenCalledTimes(1);
  });
});
