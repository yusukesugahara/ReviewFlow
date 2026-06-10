import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, Repository } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { ApplicationCreationRepository } from './application-creation.repository';

describe('ApplicationCreationRepository', () => {
  let repository: ApplicationCreationRepository;
  let apps: jest.Mocked<Pick<Repository<Application>, 'findOne' | 'manager'>>;

  beforeEach(async () => {
    apps = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(),
      } as unknown as Repository<Application>['manager'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationCreationRepository,
        { provide: getRepositoryToken(Application), useValue: apps },
      ],
    }).compile();

    repository = module.get(ApplicationCreationRepository);
  });

  it('creates an application and field values in a transaction', async () => {
    const appRepo = {
      create: jest.fn((value: Partial<Application>) => value),
      save: jest.fn().mockResolvedValue({ id: 'app-1' }),
    };
    const valueRepo = {
      create: jest.fn((value: Partial<ApplicationFieldValue>) => value),
      save: jest.fn().mockResolvedValue({}),
    };
    (apps.manager.transaction as jest.Mock).mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: (entity: unknown) =>
            entity === Application ? appRepo : valueRepo,
        } as unknown as EntityManager),
    );

    await expect(
      repository.createApplicationWithValues({
        tenantId: 'tenant-1',
        groupId: 'group-1',
        applicantUserId: 'user-1',
        applicantEmail: 'user@example.com',
        formDefinitionId: 'template-1',
        approvalFlowId: 'flow-1',
        status: ApplicationStatus.PUBLISHED,
        values: [{ formFieldId: 'field-1', valueJson: 'Expense' }],
      }),
    ).resolves.toBe('app-1');

    expect(appRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        groupId: 'group-1',
        applicantUserId: 'user-1',
        applicantEmail: 'user@example.com',
        formDefinitionId: 'template-1',
        approvalFlowId: 'flow-1',
        status: ApplicationStatus.PUBLISHED,
        currentStepOrder: null,
        submittedAt: null,
      }),
    );
    expect(valueRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      formFieldId: 'field-1',
      valueJson: 'Expense',
    });
  });
});
