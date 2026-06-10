import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ApplicationApprovalAction } from '../constants/application-approval-action';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { ApplicationReviewRepository } from './application-review.repository';

describe('ApplicationReviewRepository', () => {
  let repository: ApplicationReviewRepository;
  let apps: {
    manager: {
      transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    apps = {
      manager: {
        transaction: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationReviewRepository,
        { provide: getRepositoryToken(Application), useValue: apps },
      ],
    }).compile();

    repository = module.get(ApplicationReviewRepository);
  });

  it('saves approval history and the application in a transaction', async () => {
    const app = { id: 'app-1', tenantId: 'tenant-1' } as Application;
    const approval = { id: 'approval-1' } as ApplicationApproval;
    const approvalRepo = {
      create: jest.fn(() => approval),
      save: jest.fn(),
    };
    const appRepo = { save: jest.fn() };
    apps.manager.transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: (entity: unknown) =>
            entity === ApplicationApproval ? approvalRepo : appRepo,
        } as unknown as EntityManager),
    );

    await repository.saveApproval({
      app,
      approvalStepId: 'step-1',
      actorId: 'actor-1',
      action: ApplicationApprovalAction.APPROVED,
      comment: 'ok',
    });

    expect(approvalRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      approvalStepId: 'step-1',
      actedByUserId: 'actor-1',
      action: ApplicationApprovalAction.APPROVED,
      comment: 'ok',
    });
    expect(approvalRepo.save).toHaveBeenCalledWith(approval);
    expect(appRepo.save).toHaveBeenCalledWith(app);
  });

  it('saves return approval, correction request, items, and application in a transaction', async () => {
    const app = { id: 'app-1', tenantId: 'tenant-1' } as Application;
    const approval = { id: 'approval-1' } as ApplicationApproval;
    const correction = { id: 'correction-1' } as CorrectionRequest;
    const correctionItem = { id: 'item-1' } as CorrectionRequestItem;
    const approvalRepo = {
      create: jest.fn(() => approval),
      save: jest.fn(),
    };
    const corrRepo = {
      create: jest.fn(() => correction),
      save: jest.fn().mockResolvedValue(correction),
    };
    const itemRepo = {
      create: jest.fn(() => correctionItem),
      save: jest.fn(),
    };
    const appRepo = { save: jest.fn() };
    apps.manager.transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) =>
        run({
          getRepository: (entity: unknown) => {
            if (entity === ApplicationApproval) {
              return approvalRepo;
            }
            if (entity === CorrectionRequest) {
              return corrRepo;
            }
            if (entity === CorrectionRequestItem) {
              return itemRepo;
            }
            return appRepo;
          },
        } as unknown as EntityManager),
    );

    await repository.saveReturnForCorrection({
      app,
      approvalStepId: 'step-1',
      actorId: 'actor-1',
      overallComment: 'fix',
      fields: [{ fieldId: 'field-title', comment: 'title' }],
    });

    expect(approvalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ApplicationApprovalAction.RETURNED,
        comment: 'fix',
      }),
    );
    expect(corrRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      requestedByUserId: 'actor-1',
      status: CorrectionRequestStatus.OPEN,
      overallComment: 'fix',
      resolvedAt: null,
    });
    expect(itemRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      correctionRequestId: 'correction-1',
      formFieldId: 'field-title',
      comment: 'title',
      isResolved: false,
    });
    expect(approvalRepo.save).toHaveBeenCalledWith(approval);
    expect(corrRepo.save).toHaveBeenCalledWith(correction);
    expect(itemRepo.save).toHaveBeenCalledWith(correctionItem);
    expect(appRepo.save).toHaveBeenCalledWith(app);
  });
});
