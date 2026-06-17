import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import type { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import type { ApplicationCorrectionService } from '../review/application-correction.service';
import type { ApplicationNotificationService } from './application-notification.service';
import type { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationReturnEmailUseCaseService } from './application-return-email-use-case.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  tenantId: 'tenant-1',
  roles: ['tenant_user'],
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'form-1',
    status: ApplicationStatus.RETURNED,
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
 * ApplicationReturnEmailUseCaseService のテスト
 *
 * @group application-return-email-use-case-service
 */
describe('ApplicationReturnEmailUseCaseService', () => {
  let applicationsRepository: {
    countApprovalsByActor: jest.Mock;
    findByIdInTenant: jest.Mock;
  };
  let spaceAccess: {
    assertCanUseGroup: jest.Mock;
  };
  let accessPolicy: {
    assertCanRead: jest.Mock;
  };
  let correctionService: {
    getReturnEmailContext: jest.Mock;
  };
  let notificationService: {
    notifyApplicantOfReturn: jest.Mock;
  };
  let queryService: {
    getOneForActor: jest.Mock;
  };
  let transitionPolicy: {
    assertReturned: jest.Mock;
  };
  let service: ApplicationReturnEmailUseCaseService;

  beforeEach(() => {
    applicationsRepository = {
      countApprovalsByActor: jest.fn(),
      findByIdInTenant: jest.fn(),
    };
    spaceAccess = {
      assertCanUseGroup: jest.fn(),
    };
    accessPolicy = {
      assertCanRead: jest.fn(),
    };
    correctionService = {
      getReturnEmailContext: jest.fn(),
    };
    notificationService = {
      notifyApplicantOfReturn: jest.fn(),
    };
    queryService = {
      getOneForActor: jest.fn(),
    };
    transitionPolicy = {
      assertReturned: jest.fn(),
    };
    service = new ApplicationReturnEmailUseCaseService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy as unknown as ApplicationAccessPolicy,
      correctionService as unknown as ApplicationCorrectionService,
      notificationService as unknown as ApplicationNotificationService,
      queryService as unknown as ApplicationQueryService,
      transitionPolicy as unknown as ApplicationTransitionPolicy,
    );
  });

  it('resends a returned application email and returns the hydrated detail', async () => {
    const row = app();
    const form = template();
    const dto = {
      overallComment: 'Fix fields',
      fields: [{ fieldId: 'field-1', comment: 'Required' }],
    };
    const hydrated = app({ id: 'hydrated-app' });
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);
    correctionService.getReturnEmailContext.mockResolvedValue({
      template: form,
      dto,
    });
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(service.resend(actor(), 'app-1')).resolves.toBe(hydrated);

    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      id: 'app-1',
      detail: true,
    });
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'group-1',
    );
    expect(accessPolicy.assertCanRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      row,
      expect.any(Function),
    );
    expect(transitionPolicy.assertReturned).toHaveBeenCalledWith(row);
    expect(notificationService.notifyApplicantOfReturn).toHaveBeenCalledWith(
      row,
      form,
      dto,
    );
    expect(queryService.getOneForActor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'app-1',
    );
  });

  it('uses approval participation lookup for read policy checks', async () => {
    const row = app();
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);
    applicationsRepository.countApprovalsByActor.mockResolvedValue(1);
    accessPolicy.assertCanRead.mockImplementation(
      async (
        _actor: AuthUserPayload,
        _app: Application,
        countApprovals: (
          applicationId: string,
          actorId: string,
        ) => Promise<number>,
      ) => {
        await countApprovals('app-1', 'user-1');
      },
    );
    correctionService.getReturnEmailContext.mockResolvedValue({
      template: template(),
      dto: { fields: [] },
    });
    queryService.getOneForActor.mockResolvedValue(row);

    await service.resend(actor(), 'app-1');

    expect(applicationsRepository.countApprovalsByActor).toHaveBeenCalledWith(
      'app-1',
      'user-1',
    );
  });

  it('rejects resend when the application is not found', async () => {
    applicationsRepository.findByIdInTenant.mockResolvedValue(null);

    await expect(service.resend(actor(), 'missing-app')).rejects.toThrow();

    expect(spaceAccess.assertCanUseGroup).not.toHaveBeenCalled();
    expect(notificationService.notifyApplicantOfReturn).not.toHaveBeenCalled();
  });

  it('does not send email when returned-state validation fails', async () => {
    applicationsRepository.findByIdInTenant.mockResolvedValue(
      app({ status: ApplicationStatus.IN_REVIEW }),
    );
    transitionPolicy.assertReturned.mockImplementation(() => {
      throw new Error('not returned');
    });

    await expect(service.resend(actor(), 'app-1')).rejects.toThrow(
      'not returned',
    );

    expect(correctionService.getReturnEmailContext).not.toHaveBeenCalled();
    expect(notificationService.notifyApplicantOfReturn).not.toHaveBeenCalled();
  });
});
