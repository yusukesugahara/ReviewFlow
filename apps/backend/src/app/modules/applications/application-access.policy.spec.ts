import { ClientErrorCodes } from '../../../common/errors';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { UserRole } from '../../../models/constants/user-role';
import type { Application } from '../../../models/entities/application.entity';
import { ApplicationAccessPolicy } from './application-access.policy';

const actor = (
  id: string,
  roles: string[] = [UserRole.TENANT_USER],
): AuthUserPayload => ({
  id,
  email: `${id}@example.com`,
  tenantId: 'tenant-1',
  roles,
});

const application = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    applicantUserId: 'applicant-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'template-1',
    status: ApplicationStatus.IN_REVIEW,
    currentStepOrder: 1,
    approvalFlow: {
      steps: [
        {
          id: 'step-1',
          stepOrder: 1,
          assigneeUserId: 'reviewer-1',
        },
      ],
    },
    ...overrides,
  }) as Application;

describe('ApplicationAccessPolicy', () => {
  const policy = new ApplicationAccessPolicy();

  it('allows tenant admins to read any tenant application', async () => {
    await expect(
      policy.assertCanRead(
        actor('admin-1', [UserRole.TENANT_ADMIN]),
        application({ applicantUserId: 'other-user' }),
        jest.fn().mockResolvedValue(0),
      ),
    ).resolves.toBeUndefined();
  });

  it('allows the applicant user to read their application', async () => {
    await expect(
      policy.assertCanRead(
        actor('applicant-1'),
        application(),
        jest.fn().mockResolvedValue(0),
      ),
    ).resolves.toBeUndefined();
  });

  it('allows the current approval step assignee to act on review', () => {
    expect(policy.canActOnReview(actor('reviewer-1'), application())).toBe(
      true,
    );
  });

  it('allows any assignee registered on the current approval step to act', () => {
    expect(
      policy.canActOnReview(
        actor('reviewer-2'),
        application({
          approvalFlow: {
            steps: [
              {
                id: 'step-1',
                stepOrder: 1,
                assigneeUserId: 'reviewer-1',
                assigneeUserIds: ['reviewer-1', 'reviewer-2'],
              },
            ],
          },
        } as Partial<Application>),
      ),
    ).toBe(true);
  });

  it('allows a past approver to read a non-draft application', async () => {
    await expect(
      policy.assertCanRead(
        actor('reviewer-2'),
        application({ currentStepOrder: 2 }),
        jest.fn().mockResolvedValue(1),
      ),
    ).resolves.toBeUndefined();
  });

  it('denies unrelated users', async () => {
    await expect(
      policy.assertCanRead(
        actor('unrelated-1'),
        application({ applicantUserId: 'other-user' }),
        jest.fn().mockResolvedValue(0),
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_ACCESS_DENIED,
    });
  });
});
