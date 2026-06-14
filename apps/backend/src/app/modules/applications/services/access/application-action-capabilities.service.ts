import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { ApplicationCapabilitiesDto } from '../../dto/applications.dto';
import { disabledApplicationCapabilities } from '../../mappers/applications.mapper';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';

@Injectable()
export class ApplicationActionCapabilitiesService {
  constructor(
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  async buildForUser(
    actor: AuthUserPayload,
    app: Application,
  ): Promise<ApplicationCapabilitiesDto> {
    const isApplicant = app.applicantUserId === actor.id;
    const canReview = await this.canReviewAsUser(actor, app);
    const canReturn = canReview && this.currentStepCanReturn(app);

    return {
      canEditApplication:
        isApplicant &&
        (this.isSetupApplication(app) || this.isReturnedApplication(app)),
      canSubmitApplication: isApplicant && this.isSetupApplication(app),
      canResubmitApplication: isApplicant && this.isReturnedApplication(app),
      canApproveApplication: canReview,
      canRejectApplication: canReview,
      canReturnApplication: canReturn,
    };
  }

  buildForApplicant(
    actor: ApplicantAccessTokenPayload,
    app: Application,
  ): ApplicationCapabilitiesDto {
    if (!this.applicantTokenMatchesApplication(actor, app)) {
      return disabledApplicationCapabilities();
    }

    const canEditReturned = this.isReturnedApplication(app);
    return {
      canEditApplication: canEditReturned,
      canSubmitApplication: false,
      canResubmitApplication: canEditReturned,
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    };
  }

  private async canReviewAsUser(
    actor: AuthUserPayload,
    app: Application,
  ): Promise<boolean> {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    return canManageGroup || this.accessPolicy.canActOnReview(actor, app);
  }

  private currentStepCanReturn(app: Application): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    const currentStep = (app.approvalFlow?.steps ?? []).find(
      (step) => step.stepOrder === app.currentStepOrder,
    );
    return currentStep?.canReturn === true;
  }

  private isSetupApplication(app: Application): boolean {
    return (
      app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.PUBLISHED
    );
  }

  private isReturnedApplication(app: Application): boolean {
    return app.status === ApplicationStatus.RETURNED;
  }

  private applicantTokenMatchesApplication(
    actor: ApplicantAccessTokenPayload,
    app: Application,
  ): boolean {
    if (actor.tenantId !== app.tenantId || actor.groupId !== app.groupId) {
      return false;
    }
    if (actor.applicationId && actor.applicationId !== app.id) {
      return false;
    }
    return actor.email.toLowerCase() === app.applicantEmail.toLowerCase();
  }
}
