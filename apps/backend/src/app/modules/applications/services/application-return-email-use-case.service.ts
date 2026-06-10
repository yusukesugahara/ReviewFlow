import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { ApplicationAccessPolicy } from '../policies/application-access.policy';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationNotificationService } from './application-notification.service';
import { ApplicationQueryService } from './application-query.service';

@Injectable()
export class ApplicationReturnEmailUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async resend(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );
    this.transitionPolicy.assertReturned(app);

    const context = await this.correctionService.getReturnEmailContext(app);
    await this.notificationService.notifyApplicantOfReturn(
      app,
      context.template,
      context.dto,
    );

    return this.queryService.getOneForActor(actor, id);
  }

  private countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.queryRepository.countApprovalsByActor(applicationId, actorId);
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
  ): Promise<Application> {
    const row = await this.queryRepository.findById({
      tenantId,
      id,
      detail: true,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }
}
