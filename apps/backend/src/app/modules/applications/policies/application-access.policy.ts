import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';

type CountApprovalsByActor = (
  applicationId: string,
  actorId: string,
) => Promise<number>;

@Injectable()
export class ApplicationAccessPolicy {
  isSetupApplication(app: Application): boolean {
    return (
      app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.PUBLISHED
    );
  }

  canListForActor(
    actor: AuthUserPayload,
    app: Application,
    canManageGroup: boolean,
  ): boolean {
    return (
      app.applicantUserId === actor.id ||
      this.actorIsAssignedToCurrentStep(actor, app) ||
      (canManageGroup && this.isSetupApplication(app))
    );
  }

  canReadSetupApplicationAsManager(
    app: Application,
    canManageGroup: boolean,
  ): boolean {
    return canManageGroup && this.isSetupApplication(app);
  }

  actorIsAssignedToCurrentStep(
    actor: AuthUserPayload,
    app: Application,
  ): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    const step = this.getCurrentApprovalStep(app);
    if (!step) {
      return false;
    }
    const assigneeUserIds =
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : [step.assigneeUserId];
    return assigneeUserIds.includes(actor.id);
  }

  canActOnReview(actor: AuthUserPayload, app: Application): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return true;
    }
    return this.actorIsAssignedToCurrentStep(actor, app);
  }

  async assertCanRead(
    actor: AuthUserPayload,
    app: Application,
    countApprovalsByActor: CountApprovalsByActor,
  ): Promise<void> {
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    if (app.applicantUserId === actor.id) {
      return;
    }
    if (this.actorIsAssignedToCurrentStep(actor, app)) {
      return;
    }
    if (app.status !== ApplicationStatus.DRAFT) {
      const participated = await countApprovalsByActor(app.id, actor.id);
      if (participated > 0) {
        return;
      }
    }
    throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
  }

  private getCurrentApprovalStep(app: Application): ApprovalStep | null {
    if (app.currentStepOrder == null) {
      return null;
    }
    return (
      app.currentApprovalStep ??
      app.approvalFlow?.steps?.find(
        (step) => step.stepOrder === app.currentStepOrder,
      ) ??
      null
    );
  }
}
