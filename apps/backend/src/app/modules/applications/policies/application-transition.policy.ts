import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';

/**
 * 申請 status と current step の状態遷移ルールを所有する policy。
 *
 * service は use case の orchestration に集中し、状態の書き換えはこの policy 経由にする。
 */
@Injectable()
export class ApplicationTransitionPolicy {
  assertDraft(app: Application): void {
    if (
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.PUBLISHED
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_DRAFT);
    }
  }

  assertInReview(app: Application): void {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_IN_REVIEW);
    }
  }

  assertReturned(app: Application): void {
    if (app.status !== ApplicationStatus.RETURNED) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_RETURNED);
    }
  }

  getCurrentStep(app: Application): ApprovalStep {
    this.assertInReview(app);
    const cur =
      app.currentApprovalStep ??
      this.orderedSteps(app).find((s) => s.stepOrder === app.currentStepOrder);
    if (!cur) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_STATE_INVALID);
    }
    return cur;
  }

  getNextStep(
    app: Application,
    currentStep: ApprovalStep,
  ): ApprovalStep | null {
    return (
      this.orderedSteps(app).find(
        (s) => s.stepOrder === currentStep.stepOrder + 1,
      ) ?? null
    );
  }

  assertStepCanReturn(step: ApprovalStep): void {
    if (!step.canReturn) {
      throw clientError(ClientErrorCodes.APPLICATION_RETURN_NOT_ALLOWED);
    }
  }

  /** 下書きまたは公開済み申請を審査中へ進め、最初の承認 step を設定する。 */
  startReview(app: Application, submittedAt = new Date()): void {
    this.assertDraft(app);
    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
    app.submittedAt = submittedAt;
  }

  /** 現在 step の承認後、次 step がなければ申請を承認済みにする。 */
  applyApproval(app: Application, nextStep: ApprovalStep | null): void {
    this.assertInReview(app);
    if (!nextStep) {
      app.status = ApplicationStatus.APPROVED;
      app.currentStepOrder = null;
      return;
    }
    app.currentStepOrder = nextStep.stepOrder;
  }

  /** 審査中の申請を却下済みにする。 */
  applyReject(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.REJECTED;
    app.currentStepOrder = null;
  }

  /** 審査中の申請を差し戻し済みにし、現在 step を解除する。 */
  applyReturn(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.RETURNED;
    app.currentStepOrder = null;
  }

  /** 差し戻し済みの申請を再提出し、最初の承認 step から審査を再開する。 */
  applyResubmit(app: Application): void {
    this.assertReturned(app);
    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
  }

  private orderedSteps(app: Application): ApprovalStep[] {
    return [...(app.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
  }
}
