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

  /**
   * 審査中の申請かを検証する。
   * @param app 申請
   */
  assertInReview(app: Application): void {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_IN_REVIEW);
    }
  }

  /**
   * 差し戻し済みの申請かを検証する。
   * @param app 申請
   */
  assertReturned(app: Application): void {
    if (app.status !== ApplicationStatus.RETURNED) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_RETURNED);
    }
  }

  /**
   * 現在の承認ステップを取得する。
   * @param app 申請
   * @returns 現在の承認ステップ
   */
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

  /**
   * 次の承認ステップを取得する。
   * @param app 申請
   * @param currentStep 現在の承認ステップ
   * @returns 次の承認ステップ
   */
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

  /**
   * 承認ステップが差し戻し可能かを検証する。
   * @param step 承認ステップ
   */
  assertStepCanReturn(step: ApprovalStep): void {
    if (!step.canReturn) {
      throw clientError(ClientErrorCodes.APPLICATION_RETURN_NOT_ALLOWED);
    }
  }

  /**
   * 下書きまたは公開済み申請を審査中へ進め、最初の承認 step を設定する。
   * @param app 申請
   * @param submittedAt 提出日時
   */
  startReview(app: Application, submittedAt = new Date()): void {
    this.assertDraft(app);
    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
    app.submittedAt = submittedAt;
  }

  /**
   * 現在 step の承認後、次 step がなければ申請を承認済みにする。
   * @param app 申請
   * @param nextStep 次の承認ステップ
   */
  applyApproval(app: Application, nextStep: ApprovalStep | null): void {
    this.assertInReview(app);
    if (!nextStep) {
      app.status = ApplicationStatus.APPROVED;
      app.currentStepOrder = null;
      return;
    }
    app.currentStepOrder = nextStep.stepOrder;
  }

  /**
   * 審査中の申請を却下済みにする。
   * @param app 申請
   */
  applyReject(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.REJECTED;
    app.currentStepOrder = null;
  }

  /**
   * 審査中の申請を差し戻し済みにし、現在 step を解除する。
   * @param app 申請
   */
  applyReturn(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.RETURNED;
    app.currentStepOrder = null;
  }

  /**
   * 差し戻し済みの申請を再提出し、最初の承認 step から審査を再開する。
   * @param app 申請
   */
  applyResubmit(app: Application): void {
    this.assertReturned(app);
    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
  }

  /**
   * 承認ステップを作成順にソートして返す。
   * @param app 申請
   * @returns 承認ステップ
   */
  private orderedSteps(app: Application): ApprovalStep[] {
    return [...(app.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
  }
}
