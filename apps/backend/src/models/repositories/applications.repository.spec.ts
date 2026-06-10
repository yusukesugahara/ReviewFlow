import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';
import { ApplicationsRepository } from './applications.repository';

describe('ApplicationsRepository', () => {
  let repository: ApplicationsRepository;
  let approvals: jest.Mocked<
    Pick<Repository<ApplicationApproval>, 'count' | 'find'>
  >;
  let templates: jest.Mocked<
    Pick<Repository<FormDefinition>, 'find' | 'findOne'>
  >;
  let users: jest.Mocked<Pick<Repository<User>, 'find'>>;

  beforeEach(async () => {
    approvals = { count: jest.fn(), find: jest.fn() };
    templates = { find: jest.fn(), findOne: jest.fn() };
    users = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsRepository,
        {
          provide: getRepositoryToken(ApplicationApproval),
          useValue: approvals,
        },
        { provide: getRepositoryToken(FormDefinition), useValue: templates },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    repository = module.get(ApplicationsRepository);
  });

  it('finds templates by tenant and group', async () => {
    templates.findOne.mockResolvedValue(null);

    await repository.findTemplateByIdInGroup({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'template-1',
      onlyPublished: true,
    });

    expect(templates.findOne).toHaveBeenCalledWith({
      where: {
        id: 'template-1',
        tenantId: 'tenant-1',
        groupId: 'group-1',
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  });
});
