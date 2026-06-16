import { ClientErrorCodes } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Application } from '../../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import type { ApplicationNotificationService } from '../notifications/application-notification.service';
import type { ApplicationQueryService } from '../query/application-query.service';
import type { ApplicationReviewActionService } from '../review/application-review-action.service';
import type { TransactionManager } from '../../../../transaction';
import { ApplicationReviewUseCaseService } from './application-review-use-case.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'reviewer-1',
  email: 'reviewer@example.com',
  tenantId: 'tenant-1',
  roles: [UserRole.TENANT_USER],
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'form-1',
    status: ApplicationStatus.IN_REVIEW,
    currentStepOrder: 1,
    approvalFlow: { steps: [] },
    ...overrides,
  }) as Application;

const template = (overrides: Partial<FormDefinition> = {}): FormDefinition =>
  ({
    id: 'form-1',
    name: 'Expense',
    fields: [],
    ...overrides,
  }) as FormDefinition;

/**
 * ApplicationReviewUseCaseService のテスト
 *
 * @group application-review-use-case-service
 */
describe('ApplicationReviewUseCaseService', () => {
  let applicationsRepository: {
    findByIdInTenant: jest.Mock;
  };
  let spaceAccess: {
    actorCanManageGroup: jest.Mock;
    assertCanUseGroup: jest.Mock;
  };
  let accessPolicy: {
    canActOnReview: jest.Mock;
  };
  let notificationService: {
    notifyApplicantOfReturn: jest.Mock;
  };
  let queryService: {
    getOneForActor: jest.Mock;
  };
  let reviewActionService: {
    approve: jest.Mock;
    reject: jest.Mock;
    returnForCorrection: jest.Mock;
  };
  let auditLogs: {
    recordApplicationEvent: jest.Mock;
  };
  let transactionManager: TransactionManager;
  let transactions: ConstructorParameters<
    typeof ApplicationReviewUseCaseService
  >[7];
  let service: ApplicationReviewUseCaseService;

  beforeEach(() => {
    applicationsRepository = {
      findByIdInTenant: jest.fn(),
    };
    spaceAccess = {
      actorCanManageGroup: jest.fn(),
      assertCanUseGroup: jest.fn(),
    };
    accessPolicy = {
      canActOnReview: jest.fn(),
    };
    notificationService = {
      notifyApplicantOfReturn: jest.fn(),
    };
    queryService = {
      getOneForActor: jest.fn(),
    };
    reviewActionService = {
      approve: jest.fn(),
      reject: jest.fn(),
      returnForCorrection: jest.fn(),
    };
    auditLogs = {
      recordApplicationEvent: jest.fn(),
    };
    transactionManager = {} as TransactionManager;
    transactions = {
      run: jest.fn(<T>(work: (manager: TransactionManager) => Promise<T>) =>
        work(transactionManager),
      ),
    } as unknown as ConstructorParameters<
      typeof ApplicationReviewUseCaseService
    >[7];
    service = new ApplicationReviewUseCaseService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy as unknown as ApplicationAccessPolicy,
      notificationService as unknown as ApplicationNotificationService,
      queryService as unknown as ApplicationQueryService,
      reviewActionService as unknown as ApplicationReviewActionService,
      auditLogs as unknown as BusinessAuditLogService,
      transactions,
    );
  });

  it('approves a reviewable application and returns the hydrated detail', async () => {
    const row = app();
    const hydrated = app({ id: 'hydrated-app' });
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(true);
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(
      service.approve(actor(), 'app-1', {
        comment: 'ok',
        expectedStepOrder: 1,
      }),
    ).resolves.toBe(hydrated);

    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        id: 'app-1',
        detail: true,
      },
      transactionManager,
    );
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reviewer-1' }),
      'group-1',
    );
    expect(reviewActionService.approve).toHaveBeenCalledWith(
      row,
      'reviewer-1',
      {
        comment: 'ok',
        expectedStepOrder: 1,
      },
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.approved',
        app: row,
      }),
      transactionManager,
    );
    expect(queryService.getOneForActor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reviewer-1' }),
      'app-1',
    );
  });

  it('allows group managers to review without current-step assignment', async () => {
    const row = app();
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);
    queryService.getOneForActor.mockResolvedValue(row);

    await expect(
      service.reject(actor(), 'app-1', { expectedStepOrder: 1 }),
    ).resolves.toBe(row);

    expect(accessPolicy.canActOnReview).not.toHaveBeenCalled();
    expect(reviewActionService.reject).toHaveBeenCalledWith(
      row,
      'reviewer-1',
      { expectedStepOrder: 1 },
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.rejected',
        app: row,
      }),
      transactionManager,
    );
  });

  it('rejects review actions when the actor cannot review the application', async () => {
    applicationsRepository.findByIdInTenant.mockResolvedValue(app());
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(false);

    await expect(
      service.reject(actor(), 'app-1', { expectedStepOrder: 1 }),
    ).rejects.toThrow();

    expect(reviewActionService.reject).not.toHaveBeenCalled();
    expect(queryService.getOneForActor).not.toHaveBeenCalled();
  });

  it('rejects stale review actions when the current step changed after page load', async () => {
    applicationsRepository.findByIdInTenant.mockResolvedValue(
      app({ currentStepOrder: 2 }),
    );
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);

    await expect(
      service.approve(actor(), 'app-1', {
        comment: 'ok',
        expectedStepOrder: 1,
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_REVIEW_STATE_CONFLICT,
    });

    expect(reviewActionService.approve).not.toHaveBeenCalled();
    expect(auditLogs.recordApplicationEvent).not.toHaveBeenCalled();
    expect(queryService.getOneForActor).not.toHaveBeenCalled();
  });

  it('returns an application for correction and sends the applicant notification', async () => {
    const row = app();
    const form = template();
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(true);
    reviewActionService.returnForCorrection.mockResolvedValue(form);
    queryService.getOneForActor.mockResolvedValue(row);
    const dto = {
      expectedStepOrder: 1,
      overallComment: 'Fix fields',
      fields: [{ fieldId: 'field-1', comment: 'Required' }],
    };

    await expect(
      service.returnApplication(actor(), 'app-1', dto),
    ).resolves.toBe(row);

    expect(reviewActionService.returnForCorrection).toHaveBeenCalledWith(
      row,
      'reviewer-1',
      dto,
      transactionManager,
    );
    expect(notificationService.notifyApplicantOfReturn).toHaveBeenCalledWith(
      row,
      form,
      dto,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.returned',
        app: row,
      }),
      transactionManager,
    );
  });
});
