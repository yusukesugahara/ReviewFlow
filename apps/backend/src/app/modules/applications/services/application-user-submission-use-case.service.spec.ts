import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../groups/services/space-access.service';
import type { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import type { ApplicationFieldValuePatchService } from './application-field-value-patch.service';
import type { ApplicationQueryService } from './application-query.service';
import type { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationUserSubmissionUseCaseService } from './application-user-submission-use-case.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'applicant-user-1',
  email: 'applicant@example.com',
  tenantId: 'tenant-1',
  roles: ['tenant_user'],
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantUserId: 'applicant-user-1',
    applicantEmail: 'applicant@example.com',
    status: ApplicationStatus.DRAFT,
    ...overrides,
  }) as Application;

/**
 * ApplicationUserSubmissionUseCaseService のテスト
 *
 * @group application-user-submission-use-case-service
 */
describe('ApplicationUserSubmissionUseCaseService', () => {
  let applicationsRepository: {
    findApplicantEditable: jest.Mock;
  };
  let spaceAccess: {
    assertCanUseGroup: jest.Mock;
  };
  let fieldValuePatchService: {
    applyPatch: jest.Mock;
  };
  let flowResolver: {
    resolveActiveFlow: jest.Mock;
  };
  let queryService: {
    getOneForActor: jest.Mock;
  };
  let submissionService: {
    resubmit: jest.Mock;
    submit: jest.Mock;
  };
  let service: ApplicationUserSubmissionUseCaseService;

  beforeEach(() => {
    applicationsRepository = {
      findApplicantEditable: jest.fn(),
    };
    spaceAccess = {
      assertCanUseGroup: jest.fn(),
    };
    fieldValuePatchService = {
      applyPatch: jest.fn(),
    };
    flowResolver = {
      resolveActiveFlow: jest.fn(),
    };
    queryService = {
      getOneForActor: jest.fn(),
    };
    submissionService = {
      resubmit: jest.fn(),
      submit: jest.fn(),
    };
    service = new ApplicationUserSubmissionUseCaseService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      fieldValuePatchService as unknown as ApplicationFieldValuePatchService,
      flowResolver as unknown as ApplicationApprovalFlowResolver,
      queryService as unknown as ApplicationQueryService,
      submissionService as unknown as ApplicationSubmissionService,
    );
  });

  it('patches an editable application and returns the hydrated detail', async () => {
    const row = app();
    const hydrated = app({ id: 'hydrated-app' });
    const dto = {
      approvalFlowId: 'flow-1',
      values: { title: 'Updated' },
    };
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(service.patch(actor(), 'app-1', dto)).resolves.toBe(hydrated);

    expect(applicationsRepository.findApplicantEditable).toHaveBeenCalledWith({
      id: 'app-1',
      tenantId: 'tenant-1',
      applicantUserId: 'applicant-user-1',
      applicantEmail: 'applicant@example.com',
    });
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'applicant-user-1' }),
      'group-1',
    );
    expect(flowResolver.resolveActiveFlow).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
      'flow-1',
    );
    expect(fieldValuePatchService.applyPatch).toHaveBeenCalledWith(
      'tenant-1',
      row,
      dto,
    );
    expect(queryService.getOneForActor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'applicant-user-1' }),
      'app-1',
    );
  });

  it('does not resolve an approval flow when patch has no approvalFlowId', async () => {
    const row = app();
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    queryService.getOneForActor.mockResolvedValue(row);

    await expect(
      service.patch(actor(), 'app-1', { values: { title: 'Updated' } }),
    ).resolves.toBe(row);

    expect(flowResolver.resolveActiveFlow).not.toHaveBeenCalled();
  });

  it('submits an editable application', async () => {
    const row = app();
    const hydrated = app({ status: ApplicationStatus.IN_REVIEW });
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(service.submit(actor(), 'app-1')).resolves.toBe(hydrated);

    expect(submissionService.submit).toHaveBeenCalledWith('tenant-1', row);
  });

  it('resubmits an editable returned application', async () => {
    const row = app({ status: ApplicationStatus.RETURNED });
    const hydrated = app({ status: ApplicationStatus.IN_REVIEW });
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    queryService.getOneForActor.mockResolvedValue(hydrated);

    await expect(service.resubmit(actor(), 'app-1')).resolves.toBe(hydrated);

    expect(submissionService.resubmit).toHaveBeenCalledWith('tenant-1', row);
  });

  it('rejects operations when the applicant application cannot be loaded', async () => {
    applicationsRepository.findApplicantEditable.mockResolvedValue(null);

    await expect(service.submit(actor(), 'missing-app')).rejects.toThrow();

    expect(spaceAccess.assertCanUseGroup).not.toHaveBeenCalled();
    expect(submissionService.submit).not.toHaveBeenCalled();
  });
});
