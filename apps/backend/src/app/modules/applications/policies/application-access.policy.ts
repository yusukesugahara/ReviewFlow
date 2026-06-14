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

/**
 * 申請に対する閲覧・レビュー操作の認可判断を集約する policy。
 *
 * controller / use case に role・申請者・現在承認ステップの判定を散らさないために使う。
 */
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

  /**
   * 申請詳細の閲覧可否を検証する。
   *
   * 管理者、申請者、現在 step の担当者、過去に承認へ参加したユーザーのみ許可する。
   */
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
