import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { ApplicationSubmissionRepository } from './application-submission.repository';

describe('ApplicationSubmissionRepository', () => {
  let repository: ApplicationSubmissionRepository;
  let apps: {
    manager: {
      transaction: jest.Mock;
    };
  };
  let fieldValues: {
    create: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    apps = {
      manager: {
        transaction: jest.fn(),
      },
    };
    fieldValues = {
      create: jest.fn((value: Partial<ApplicationFieldValue>) => ({
        ...value,
      })),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationSubmissionRepository,
        {
          provide: getRepositoryToken(Application),
          useValue: apps,
        },
        {
          provide: getRepositoryToken(ApplicationFieldValue),
          useValue: fieldValues,
        },
      ],
    }).compile();

    repository = module.get(ApplicationSubmissionRepository);
  });

  it('loads existing field values for an application', async () => {
    fieldValues.find.mockResolvedValue([]);

    await repository.findExistingFieldValues({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
    });

    expect(fieldValues.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', applicationId: 'app-1' },
    });
  });

  it('loads existing field values through a transaction manager', async () => {
    const managerRepository = { find: jest.fn().mockResolvedValue([]) };
    const getRepository = jest.fn().mockReturnValue(managerRepository);
    const manager = {
      getRepository,
    } as unknown as EntityManager;

    await repository.findExistingFieldValues(
      {
        tenantId: 'tenant-1',
        applicationId: 'app-1',
      },
      manager,
    );

    expect(getRepository).toHaveBeenCalledWith(ApplicationFieldValue);
    expect(managerRepository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', applicationId: 'app-1' },
    });
    expect(fieldValues.find).not.toHaveBeenCalled();
  });

  it('creates field value entities through TypeORM repository', () => {
    repository.createFieldValue({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      formFieldId: 'field-1',
      valueJson: 'Expense',
    });

    expect(fieldValues.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      formFieldId: 'field-1',
      valueJson: 'Expense',
    });
  });

  it('saves an application patch in a transaction', async () => {
    const target = {
      id: 'app-1',
      formDefinitionId: 'template-1',
      approvalFlowId: 'flow-1',
      status: ApplicationStatus.DRAFT,
    } as Application;
    const patchedValue = {
      id: 'value-1',
      applicationId: 'app-1',
    } as ApplicationFieldValue;
    const appRepo = { save: jest.fn() };
    const valueRepo = { delete: jest.fn(), save: jest.fn() };
    apps.manager.transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: (entity: unknown) =>
            entity === Application ? appRepo : valueRepo,
        } as unknown as EntityManager),
    );

    await repository.saveApplicationPatch({
      app: target,
      formDefinitionId: 'template-2',
      approvalFlowId: 'flow-2',
      status: ApplicationStatus.PUBLISHED,
      values: [patchedValue],
    });

    expect(target.formDefinitionId).toBe('template-2');
    expect(target.approvalFlowId).toBe('flow-2');
    expect(target.status).toBe(ApplicationStatus.PUBLISHED);
    expect(valueRepo.delete).toHaveBeenCalledWith({ applicationId: 'app-1' });
    expect(appRepo.save).toHaveBeenCalledWith(target);
    expect(valueRepo.save).toHaveBeenCalledWith([patchedValue]);
  });

  it('skips empty application patches', async () => {
    await repository.saveApplicationPatch({
      app: { id: 'app-1' } as Application,
      values: [],
    });

    expect(apps.manager.transaction.mock.calls).toHaveLength(0);
  });

  it('saves submitted applications in a transaction', async () => {
    const target = { id: 'app-1' } as Application;
    const appRepo = { save: jest.fn() };
    apps.manager.transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: () => appRepo,
        } as unknown as EntityManager),
    );

    await repository.saveSubmittedApplication(target);

    expect(appRepo.save).toHaveBeenCalledWith(target);
  });

  it('resolves the open correction and saves resubmitted applications', async () => {
    const target = { id: 'app-1' } as Application;
    const item = { id: 'item-1', isResolved: false } as CorrectionRequestItem;
    const correction = {
      id: 'correction-1',
      status: CorrectionRequestStatus.OPEN,
      resolvedAt: null,
      items: [item],
    } as CorrectionRequest;
    const appRepo = { save: jest.fn() };
    const corrRepo = { save: jest.fn() };
    const itemRepo = { save: jest.fn() };
    apps.manager.transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: (entity: unknown) => {
            if (entity === Application) {
              return appRepo;
            }
            if (entity === CorrectionRequest) {
              return corrRepo;
            }
            return itemRepo;
          },
        } as unknown as EntityManager),
    );

    await repository.saveResubmittedApplication({
      app: target,
      openCorrection: correction,
    });

    expect(correction.status).toBe(CorrectionRequestStatus.RESOLVED);
    expect(correction.resolvedAt).toBeInstanceOf(Date);
    expect(item.isResolved).toBe(true);
    expect(corrRepo.save).toHaveBeenCalledWith(correction);
    expect(itemRepo.save).toHaveBeenCalledWith(item);
    expect(appRepo.save).toHaveBeenCalledWith(target);
  });
});
