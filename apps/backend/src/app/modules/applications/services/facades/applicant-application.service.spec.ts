import type { DataSource } from 'typeorm';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import type { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import type { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicantApplicationAccessService } from '../access/applicant-application-access.service';
import type { ApplicationCorrectionService } from '../review/application-correction.service';
import type { ApplicationCreationService } from '../creation/application-creation.service';
import type { ApplicationFieldValuePatchService } from '../field-values/application-field-value-patch.service';
import type { ApplicationNotificationService } from '../notifications/application-notification.service';
import type { ApplicationProgressService } from '../progress/application-progress.service';
import type { ApplicationSubmissionService } from '../submission/application-submission.service';
import type { TransactionManager } from '../../../../transaction';
import { ApplicantApplicationService } from './applicant-application.service';

const applicant = (
  overrides: Partial<ApplicantAccessTokenPayload> = {},
): ApplicantAccessTokenPayload => ({
  kind: 'applicant_access',
  tenantId: 'tenant-1',
  email: 'applicant@example.com',
  groupId: 'group-1',
  formDefinitionId: 'form-from-token',
  applicationId: 'app-1',
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    applicantUserId: null,
    status: ApplicationStatus.RETURNED,
    fieldValues: [],
    ...overrides,
  }) as Application;

/**
 * ApplicantApplicationService のテスト
 *
 * @group applicant-application-service
 */
describe('ApplicantApplicationService', () => {
  let applicationsRepository: {
    findApplicantEditable: jest.Mock;
    findByIdInTenant: jest.Mock;
  };
  let correctionService: {
    buildTargetsResponse: jest.Mock;
  };
  let creationService: {
    create: jest.Mock;
  };
  let fieldValuePatchService: {
    applyPatch: jest.Mock;
  };
  let flowResolver: {
    resolveDefaultActiveFlow: jest.Mock;
  };
  let notificationService: {
    notifyApplicantOfSubmission: jest.Mock;
  };
  let progressService: {
    hydrate: jest.Mock;
  };
  let submissionService: {
    resubmit: jest.Mock;
    submit: jest.Mock;
  };
  let auditLogs: {
    recordApplicationEvent: jest.Mock;
  };
  let transactionManager: TransactionManager;
  let dataSource: DataSource;
  let service: ApplicantApplicationService;

  beforeEach(() => {
    applicationsRepository = {
      findApplicantEditable: jest.fn(),
      findByIdInTenant: jest.fn(),
    };
    correctionService = {
      buildTargetsResponse: jest.fn(),
    };
    creationService = {
      create: jest.fn(),
    };
    fieldValuePatchService = {
      applyPatch: jest.fn(),
    };
    flowResolver = {
      resolveDefaultActiveFlow: jest.fn(),
    };
    notificationService = {
      notifyApplicantOfSubmission: jest.fn(),
    };
    progressService = {
      hydrate: jest.fn((row: Application) => Promise.resolve(row)),
    };
    submissionService = {
      resubmit: jest.fn(),
      submit: jest.fn(),
    };
    auditLogs = {
      recordApplicationEvent: jest.fn(),
    };
    transactionManager = {} as TransactionManager;
    dataSource = {
      transaction: jest.fn(
        <T>(work: (manager: TransactionManager) => Promise<T>) =>
          work(transactionManager),
      ),
    } as unknown as DataSource;
    const applicantAccess = new ApplicantApplicationAccessService(
      applicationsRepository as unknown as ApplicationQueryRepository,
    );
    service = new ApplicantApplicationService(
      applicantAccess,
      correctionService as unknown as ApplicationCorrectionService,
      creationService as unknown as ApplicationCreationService,
      fieldValuePatchService as unknown as ApplicationFieldValuePatchService,
      flowResolver as unknown as ApplicationApprovalFlowResolver,
      notificationService as unknown as ApplicationNotificationService,
      progressService as unknown as ApplicationProgressService,
      submissionService as unknown as ApplicationSubmissionService,
      auditLogs as unknown as BusinessAuditLogService,
      dataSource,
    );
  });

  it('creates and submits a public application using token scope', async () => {
    const created = app({ id: 'created-app', status: ApplicationStatus.DRAFT });
    const submitted = app({
      id: 'created-app',
      status: ApplicationStatus.IN_REVIEW,
    });
    flowResolver.resolveDefaultActiveFlow.mockResolvedValue({ id: 'flow-1' });
    creationService.create.mockResolvedValue(created);
    applicationsRepository.findByIdInTenant.mockResolvedValue(submitted);

    await expect(
      service.createAndSubmit(applicant(), {
        groupId: 'group-1',
        formDefinitionId: 'form-from-body',
        values: { title: 'Request' },
      }),
    ).resolves.toBe(submitted);

    expect(creationService.create).toHaveBeenCalledWith(
      'tenant-1',
      'applicant@example.com',
      null,
      expect.objectContaining({
        approvalFlowId: 'flow-1',
        formDefinitionId: 'form-from-token',
        groupId: 'group-1',
        status: ApplicationStatus.DRAFT,
      }),
      transactionManager,
    );
    expect(submissionService.submit).toHaveBeenCalledWith(
      'tenant-1',
      created,
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.created',
        app: created,
      }),
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.submitted',
        app: created,
      }),
      transactionManager,
    );
    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      id: 'created-app',
      detail: true,
    });
    expect(
      notificationService.notifyApplicantOfSubmission,
    ).toHaveBeenCalledWith(submitted);
  });

  it('loads the current token application detail and hydrates it', async () => {
    const row = app({ status: ApplicationStatus.IN_REVIEW });
    applicationsRepository.findByIdInTenant.mockResolvedValue(row);

    await expect(service.getCurrentApplication(applicant())).resolves.toBe(row);

    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith({
      id: 'app-1',
      tenantId: 'tenant-1',
      detail: true,
    });
    expect(progressService.hydrate).toHaveBeenCalledWith(row);
  });

  it('rejects public application creation outside the token group', async () => {
    await expect(
      service.createAndSubmit(applicant(), {
        groupId: 'other-group',
        values: {},
      }),
    ).rejects.toThrow();

    expect(flowResolver.resolveDefaultActiveFlow).not.toHaveBeenCalled();
    expect(creationService.create).not.toHaveBeenCalled();
  });

  it('builds returned correction targets for the token application', async () => {
    const row = app();
    const response = {
      applicationId: 'app-1',
      applicationStatus: ApplicationStatus.RETURNED,
      values: {},
      openCorrection: null,
    };
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    correctionService.buildTargetsResponse.mockResolvedValue(response);

    await expect(service.getReturnedCorrection(applicant())).resolves.toEqual(
      response,
    );

    expect(applicationsRepository.findApplicantEditable).toHaveBeenCalledWith(
      {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: undefined,
        applicantEmail: 'applicant@example.com',
      },
      undefined,
    );
  });

  it('rejects patch when the token is tied to another application', async () => {
    await expect(
      service.patchReturned(
        applicant({ applicationId: 'other-app' }),
        'app-1',
        {
          values: { title: 'Fixed' },
        },
      ),
    ).rejects.toThrow();

    expect(applicationsRepository.findApplicantEditable).not.toHaveBeenCalled();
    expect(fieldValuePatchService.applyPatch).not.toHaveBeenCalled();
  });

  it('patches returned values and hydrates the updated application', async () => {
    const row = app();
    const updated = app({ id: 'app-1', status: ApplicationStatus.RETURNED });
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    applicationsRepository.findByIdInTenant.mockResolvedValue(updated);

    await expect(
      service.patchReturned(applicant(), 'app-1', {
        values: { title: 'Fixed' },
      }),
    ).resolves.toBe(updated);

    expect(applicationsRepository.findApplicantEditable).toHaveBeenCalledWith(
      {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: undefined,
        applicantEmail: 'applicant@example.com',
      },
      transactionManager,
    );
    expect(fieldValuePatchService.applyPatch).toHaveBeenCalledWith(
      'tenant-1',
      row,
      { values: { title: 'Fixed' } },
      transactionManager,
    );
    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith({
      id: 'app-1',
      tenantId: 'tenant-1',
      detail: true,
    });
    expect(progressService.hydrate).toHaveBeenCalledWith(updated);
  });

  it('resubmits the token application and hydrates the updated application', async () => {
    const row = app();
    const updated = app({ id: 'app-1', status: ApplicationStatus.IN_REVIEW });
    applicationsRepository.findApplicantEditable.mockResolvedValue(row);
    applicationsRepository.findByIdInTenant.mockResolvedValue(updated);

    await expect(
      service.resubmit(applicant(), 'app-1', { message: ' 補足です ' }),
    ).resolves.toBe(updated);

    expect(applicationsRepository.findApplicantEditable).toHaveBeenCalledWith(
      {
        id: 'app-1',
        tenantId: 'tenant-1',
        applicantUserId: undefined,
        applicantEmail: 'applicant@example.com',
      },
      transactionManager,
    );
    expect(submissionService.resubmit).toHaveBeenCalledWith(
      'tenant-1',
      row,
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.resubmitted',
        metadataJson: { message: '補足です' },
      }),
      transactionManager,
    );
    expect(applicationsRepository.findByIdInTenant).toHaveBeenCalledWith({
      id: 'app-1',
      tenantId: 'tenant-1',
      detail: true,
    });
    expect(progressService.hydrate).toHaveBeenCalledWith(updated);
  });
});
