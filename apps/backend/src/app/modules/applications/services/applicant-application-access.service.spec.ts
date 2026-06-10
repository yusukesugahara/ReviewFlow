import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { ApplicantApplicationAccessService } from './applicant-application-access.service';

const applicant = (
  overrides: Partial<ApplicantAccessTokenPayload> = {},
): ApplicantAccessTokenPayload => ({
  kind: 'applicant_access',
  tenantId: 'tenant-1',
  email: 'applicant@example.com',
  groupId: 'group-1',
  formDefinitionId: 'form-1',
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
    ...overrides,
  }) as Application;

const expectErrorCode = (act: () => void, errorCode: string): void => {
  expect.assertions(1);
  try {
    act();
  } catch (error: unknown) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('ApplicantApplicationAccessService', () => {
  let queryRepository: {
    findApplicantEditable: jest.Mock;
    findById: jest.Mock;
  };
  let service: ApplicantApplicationAccessService;

  beforeEach(() => {
    queryRepository = {
      findApplicantEditable: jest.fn(),
      findById: jest.fn(),
    };
    service = new ApplicantApplicationAccessService(
      queryRepository as unknown as ApplicationQueryRepository,
    );
  });

  it('rejects application creation outside the token group', () => {
    expectErrorCode(
      () => service.assertCanCreateInGroup(applicant(), 'other-group'),
      ClientErrorCodes.APPLICATION_ACCESS_DENIED,
    );
  });

  it('loads submitted applications by tenant and id', async () => {
    const row = app({ status: ApplicationStatus.IN_REVIEW });
    queryRepository.findById.mockResolvedValue(row);

    await expect(
      service.loadSubmittedApplication('tenant-1', 'app-1', { detail: true }),
    ).resolves.toBe(row);

    expect(queryRepository.findById).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      id: 'app-1',
      detail: true,
    });
  });

  it('loads editable applications within the token application and group scope', async () => {
    const row = app();
    queryRepository.findApplicantEditable.mockResolvedValue(row);

    await expect(
      service.loadEditableApplication(applicant(), 'app-1'),
    ).resolves.toBe(row);

    expect(queryRepository.findApplicantEditable).toHaveBeenCalledWith({
      id: 'app-1',
      tenantId: 'tenant-1',
      applicantUserId: undefined,
      applicantEmail: 'applicant@example.com',
    });
  });

  it('rejects editable loads outside the token application', async () => {
    await expect(
      service.loadEditableApplication(
        applicant({ applicationId: 'other-app' }),
        'app-1',
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_ACCESS_DENIED,
    });

    expect(queryRepository.findApplicantEditable).not.toHaveBeenCalled();
  });

  it('rejects editable loads outside the token group', async () => {
    queryRepository.findApplicantEditable.mockResolvedValue(
      app({ groupId: 'other-group' }),
    );

    await expect(
      service.loadEditableApplication(applicant(), 'app-1'),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_ACCESS_DENIED,
    });
  });
});
