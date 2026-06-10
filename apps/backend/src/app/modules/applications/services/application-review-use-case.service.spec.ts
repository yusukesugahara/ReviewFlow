import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../groups/services/space-access.service';
import type { ApplicationAccessPolicy } from '../policies/application-access.policy';
import type { ApplicationNotificationService } from './application-notification.service';
import type { ApplicationQueryService } from './application-query.service';
import type { ApplicationReviewActionService } from './application-review-action.service';
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
    findById: jest.Mock;
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
  let service: ApplicationReviewUseCaseService;

  beforeEach(() => {
    applicationsRepository = {
      findById: jest.fn(),
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
    service = new ApplicationReviewUseCaseService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy as unknown as ApplicationAccessPolicy,
      notificationService as unknown as ApplicationNotificationService,
      queryService as unknown as ApplicationQueryService,
      reviewActionService as unknown as ApplicationReviewActionService,
    );
  });

  it('approves a reviewable application and returns the hydrated detail', async () => {
    const row = app();
    const hydrated = app({ id: 'hydrated-app' });
    applicationsRepository.findById.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(true);
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(
      service.approve(actor(), 'app-1', { comment: 'ok' }),
    ).resolves.toBe(hydrated);

    expect(applicationsRepository.findById).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      id: 'app-1',
      detail: true,
    });
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reviewer-1' }),
      'group-1',
    );
    expect(reviewActionService.approve).toHaveBeenCalledWith(
      row,
      'reviewer-1',
      {
        comment: 'ok',
      },
    );
    expect(queryService.getOneForActor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reviewer-1' }),
      'app-1',
    );
  });

  it('allows group managers to review without current-step assignment', async () => {
    const row = app();
    applicationsRepository.findById.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);
    queryService.getOneForActor.mockResolvedValue(row);

    await expect(service.reject(actor(), 'app-1', {})).resolves.toBe(row);

    expect(accessPolicy.canActOnReview).not.toHaveBeenCalled();
    expect(reviewActionService.reject).toHaveBeenCalledWith(
      row,
      'reviewer-1',
      {},
    );
  });

  it('rejects review actions when the actor cannot review the application', async () => {
    applicationsRepository.findById.mockResolvedValue(app());
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(false);

    await expect(service.reject(actor(), 'app-1', {})).rejects.toThrow();

    expect(reviewActionService.reject).not.toHaveBeenCalled();
    expect(queryService.getOneForActor).not.toHaveBeenCalled();
  });

  it('returns an application for correction and sends the applicant notification', async () => {
    const row = app();
    const form = template();
    applicationsRepository.findById.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.canActOnReview.mockReturnValue(true);
    reviewActionService.returnForCorrection.mockResolvedValue(form);
    queryService.getOneForActor.mockResolvedValue(row);
    const dto = {
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
    );
    expect(notificationService.notifyApplicantOfReturn).toHaveBeenCalledWith(
      row,
      form,
      dto,
    );
  });
});
