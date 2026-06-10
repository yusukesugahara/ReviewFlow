import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { ApplicationAccessPolicy } from '../policies/application-access.policy';
import { ApplicationNotificationService } from './application-notification.service';
import { ApplicationQueryService } from './application-query.service';
import { ApplicationReviewActionService } from './application-review-action.service';

@Injectable()
export class ApplicationReviewUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly reviewActionService: ApplicationReviewActionService,
  ) {}

  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    await this.reviewActionService.approve(app, actor.id, dto);
    return this.queryService.getOneForActor(actor, id);
  }

  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    await this.reviewActionService.reject(app, actor.id, dto);
    return this.queryService.getOneForActor(actor, id);
  }

  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    const template = await this.reviewActionService.returnForCorrection(
      app,
      actor.id,
      dto,
    );
    await this.notificationService.notifyApplicantOfReturn(app, template, dto);
    return this.queryService.getOneForActor(actor, id);
  }

  private async loadReviewableApplication(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    if (!canManageGroup && !this.accessPolicy.canActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    return app;
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
