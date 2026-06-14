import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationActionCapabilitiesService } from './application-action-capabilities.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  tenantId: 'tenant-1',
  roles: [UserRole.TENANT_USER],
  ...overrides,
});

const applicantActor = (
  overrides: Partial<ApplicantAccessTokenPayload> = {},
): ApplicantAccessTokenPayload => ({
  kind: 'applicant_access',
  email: 'applicant@example.com',
  tenantId: 'tenant-1',
  groupId: 'group-1',
  applicationId: 'app-1',
  formDefinitionId: undefined,
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application => {
  const currentApprovalStep = {
    id: 'step-1',
    stepOrder: 1,
    assigneeUserId: 'reviewer-1',
    assigneeUserIds: ['reviewer-1'],
    canReturn: true,
  };
  return {
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantUserId: 'applicant-1',
    applicantEmail: 'applicant@example.com',
    status: ApplicationStatus.IN_REVIEW,
    currentStepOrder: 1,
    currentApprovalStep,
    approvalFlow: {
      steps: [currentApprovalStep],
    },
    ...overrides,
  } as Application;
};

describe('ApplicationActionCapabilitiesService', () => {
  let spaceAccess: { actorCanManageGroup: jest.Mock };
  let service: ApplicationActionCapabilitiesService;

  beforeEach(() => {
    spaceAccess = {
      actorCanManageGroup: jest.fn().mockResolvedValue(false),
    };
    service = new ApplicationActionCapabilitiesService(
      new ApplicationAccessPolicy(),
      spaceAccess as unknown as SpaceAccessService,
    );
  });

  it('allows current step assignees to review and return when the step allows return', async () => {
    const capabilities = await service.buildForUser(
      actor({ id: 'reviewer-1' }),
      app(),
    );

    expect(capabilities).toMatchObject({
      canApproveApplication: true,
      canRejectApplication: true,
      canReturnApplication: true,
    });
  });

  it('allows space managers to review even when they are not current step assignees', async () => {
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);

    const capabilities = await service.buildForUser(
      actor({ id: 'manager-1' }),
      app(),
    );

    expect(capabilities).toMatchObject({
      canApproveApplication: true,
      canRejectApplication: true,
      canReturnApplication: true,
    });
  });

  it('allows only applicant users to edit and submit setup applications', async () => {
    const capabilities = await service.buildForUser(
      actor({ id: 'applicant-1' }),
      app({ status: ApplicationStatus.PUBLISHED }),
    );

    expect(capabilities).toMatchObject({
      canEditApplication: true,
      canSubmitApplication: true,
      canResubmitApplication: false,
      canApproveApplication: false,
    });
  });

  it('does not allow same-email non-applicant users to edit user-owned applications', async () => {
    const capabilities = await service.buildForUser(
      actor({ id: 'other-user', email: 'applicant@example.com' }),
      app({ status: ApplicationStatus.PUBLISHED }),
    );

    expect(capabilities.canEditApplication).toBe(false);
    expect(capabilities.canSubmitApplication).toBe(false);
  });

  it('allows applicant access tokens to edit and resubmit their returned application', () => {
    const capabilities = service.buildForApplicant(
      applicantActor(),
      app({ status: ApplicationStatus.RETURNED }),
    );

    expect(capabilities).toMatchObject({
      canEditApplication: true,
      canResubmitApplication: true,
      canApproveApplication: false,
    });
  });

  it('disables applicant token capabilities when the token targets another application', () => {
    const capabilities = service.buildForApplicant(
      applicantActor({ applicationId: 'other-app' }),
      app({ status: ApplicationStatus.RETURNED }),
    );

    expect(capabilities).toEqual({
      canEditApplication: false,
      canSubmitApplication: false,
      canResubmitApplication: false,
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    });
  });
});
