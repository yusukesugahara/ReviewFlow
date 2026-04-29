import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { ApplicationStatus } from '../../../models/constants/application-status';
import type { Application } from '../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../models/entities/approval-step.entity';

@Injectable()
export class ApplicationTransitionPolicy {
  assertDraft(app: Application): void {
    if (app.status !== ApplicationStatus.DRAFT) {
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
    const cur = this.orderedSteps(app).find(
      (s) => s.stepOrder === app.currentStepOrder,
    );
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

  startReview(app: Application, submittedAt = new Date()): void {
    this.assertDraft(app);
    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
    app.submittedAt = submittedAt;
  }

  applyApproval(app: Application, nextStep: ApprovalStep | null): void {
    this.assertInReview(app);
    if (!nextStep) {
      app.status = ApplicationStatus.APPROVED;
      app.currentStepOrder = null;
      return;
    }
    app.currentStepOrder = nextStep.stepOrder;
  }

  applyReject(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.REJECTED;
    app.currentStepOrder = null;
  }

  applyReturn(app: Application): void {
    this.assertInReview(app);
    app.status = ApplicationStatus.RETURNED;
    app.currentStepOrder = null;
  }

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
