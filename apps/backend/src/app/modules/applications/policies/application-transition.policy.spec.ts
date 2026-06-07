import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import { ApplicationTransitionPolicy } from './application-transition.policy';

const step = (
  stepOrder: number,
  overrides: Partial<ApprovalStep> = {},
): ApprovalStep =>
  ({
    id: `step-${stepOrder}`,
    stepOrder,
    stepName: `Step ${stepOrder}`,
    assigneeUserId: `reviewer-${stepOrder}`,
    canReturn: false,
    ...overrides,
  }) as ApprovalStep;

const application = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    status: ApplicationStatus.DRAFT,
    currentStepOrder: null,
    submittedAt: null,
    approvalFlow: {
      steps: [step(2), step(1)],
    },
    ...overrides,
  }) as Application;

/**
 * ApplicationTransitionPolicy のテスト
 *
 * @group application-transition-policy
 */
describe('ApplicationTransitionPolicy', () => {
  const policy = new ApplicationTransitionPolicy();

  /**
   * 草稿からレビューを開始すること
   */
  it('starts review from draft', () => {
    const app = application();
    const submittedAt = new Date('2026-01-01T00:00:00.000Z');

    policy.startReview(app, submittedAt);

    expect(app).toMatchObject({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 1,
      submittedAt,
    });
  });

  /**
   * 公開済みからレビューを開始すること
   */
  it('starts review from published', () => {
    const app = application({ status: ApplicationStatus.PUBLISHED });
    const submittedAt = new Date('2026-01-01T00:00:00.000Z');

    policy.startReview(app, submittedAt);

    expect(app).toMatchObject({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 1,
      submittedAt,
    });
  });

  /**
   * 不正な現在の承認ステータスに対してエラーを返すこと
   */
  it('rejects invalid current approval state', () => {
    expect.assertions(1);

    try {
      policy.getCurrentStep(
        application({
          status: ApplicationStatus.IN_REVIEW,
          currentStepOrder: 3,
        }),
      );
    } catch (error: unknown) {
      expect(error).toMatchObject({
        errorCode: ClientErrorCodes.APPLICATION_APPROVAL_STATE_INVALID,
      });
    }
  });

  /**
   * 中間ステップを承認すると次のステップに移行すること
   */
  it('moves to the next step when approving an intermediate step', () => {
    const app = application({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 1,
    });
    const cur = policy.getCurrentStep(app);
    const next = policy.getNextStep(app, cur);

    policy.applyApproval(app, next);

    expect(app).toMatchObject({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 2,
    });
  });

  /**
   * 最終ステップを承認すると申請が承認されること
   */
  it('approves the application when approving the final step', () => {
    const app = application({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 2,
    });
    const cur = policy.getCurrentStep(app);
    const next = policy.getNextStep(app, cur);

    policy.applyApproval(app, next);

    expect(app).toMatchObject({
      status: ApplicationStatus.APPROVED,
      currentStepOrder: null,
    });
  });

  /**
   * 明示的な遷移で申請を返却し再提出すること
   */
  it('returns and resubmits an application through explicit transitions', () => {
    const app = application({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 1,
    });

    policy.applyReturn(app);
    expect(app).toMatchObject({
      status: ApplicationStatus.RETURNED,
      currentStepOrder: null,
    });

    policy.applyResubmit(app);
    expect(app).toMatchObject({
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 1,
    });
  });
});
