import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { UserRole } from '../../../models/constants/user-role';
import type { Application } from '../../../models/entities/application.entity';
import type { ApplicantAccessTokenPayload } from '../auth/auth.service';

type CountApprovalsByActor = (
  applicationId: string,
  actorId: string,
) => Promise<number>;

@Injectable()
export class ApplicationAccessPolicy {
  actorIsAssignedToCurrentStep(
    actor: AuthUserPayload,
    app: Application,
  ): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    const step = app.approvalFlow?.steps?.find(
      (s) => s.stepOrder === app.currentStepOrder,
    );
    if (!step) {
      return false;
    }
    return step.assigneeUserId === actor.id;
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

  assertApplicantOwns(
    actor: ApplicantAccessTokenPayload,
    app: Application,
  ): void {
    if (
      app.tenantId !== actor.tenantId ||
      app.formTemplateId !== actor.templateId ||
      app.applicantEmail !== actor.email
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }
}
