import { ClientErrorCodes } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
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

/**
 * ApplicationAccessPolicy のテスト
 *
 * @group application-access-policy
 */
describe('ApplicationAccessPolicy', () => {
  const policy = new ApplicationAccessPolicy();

  /**
   * tenant_admin が任意のテナントの申請を読み込めること
   */
  it('allows tenant admins to read any tenant application', async () => {
    await expect(
      policy.assertCanRead(
        actor('admin-1', [UserRole.TENANT_ADMIN]),
        application({ applicantUserId: 'other-user' }),
        jest.fn().mockResolvedValue(0),
      ),
    ).resolves.toBeUndefined();
  });

  /**
   * 申請者が自分の申請を読み込めること
   */
  it('allows the applicant user to read their application', async () => {
    await expect(
      policy.assertCanRead(
        actor('applicant-1'),
        application(),
        jest.fn().mockResolvedValue(0),
      ),
    ).resolves.toBeUndefined();
  });

  /**
   * 現在の承認ステップの担当者が承認操作を行えること
   */
  it('allows the current approval step assignee to act on review', () => {
    expect(policy.canActOnReview(actor('reviewer-1'), application())).toBe(
      true,
    );
  });

  /**
   * 現在の承認ステップに登録された担当者が承認操作を行えること
   */
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

  it('allows setup applications to be listed by group managers', () => {
    expect(
      policy.canListForActor(
        actor('manager-1'),
        application({
          applicantUserId: 'other-user',
          status: ApplicationStatus.PUBLISHED,
        }),
        true,
      ),
    ).toBe(true);
  });

  it('does not treat non setup applications as manager-readable setup rows', () => {
    expect(
      policy.canReadSetupApplicationAsManager(
        application({ status: ApplicationStatus.IN_REVIEW }),
        true,
      ),
    ).toBe(false);
  });

  /**
   * 過去に承認した担当者が非草稿の申請を読み込めること
   */
  it('allows a past approver to read a non-draft application', async () => {
    await expect(
      policy.assertCanRead(
        actor('reviewer-2'),
        application({ currentStepOrder: 2 }),
        jest.fn().mockResolvedValue(1),
      ),
    ).resolves.toBeUndefined();
  });

  /**
   * 関係のないユーザが申請を読み込めないこと
   */
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
