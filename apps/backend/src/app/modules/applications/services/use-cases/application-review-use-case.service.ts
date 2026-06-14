import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationNotificationService } from '../notifications/application-notification.service';
import { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationReviewActionService } from '../review/application-review-action.service';

@Injectable()
export class ApplicationReviewUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly reviewActionService: ApplicationReviewActionService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    const before = this.snapshot(app);
    await this.reviewActionService.approve(app, actor.id, dto);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_APPROVED,
      actor: { id: actor.id, email: actor.email, type: 'user' },
      app,
      before,
      after: this.snapshot(app),
      metadataJson: { comment: this.trimComment(dto.comment) },
    });
    return this.queryService.getOneForActor(actor, id);
  }

  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    const before = this.snapshot(app);
    await this.reviewActionService.reject(app, actor.id, dto);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_REJECTED,
      actor: { id: actor.id, email: actor.email, type: 'user' },
      app,
      before,
      after: this.snapshot(app),
      metadataJson: { comment: this.trimComment(dto.comment) },
    });
    return this.queryService.getOneForActor(actor, id);
  }

  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    const app = await this.loadReviewableApplication(actor, id);
    const before = this.snapshot(app);
    const template = await this.reviewActionService.returnForCorrection(
      app,
      actor.id,
      dto,
    );
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_RETURNED,
      actor: { id: actor.id, email: actor.email, type: 'user' },
      app,
      before,
      after: this.snapshot(app),
      metadataJson: {
        overallComment: this.trimComment(dto.overallComment),
        fieldIds: dto.fields.map((field) => field.fieldId),
      },
    });
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

  private snapshot(app: Application) {
    return {
      status: app.status,
      stepOrder: app.currentStepOrder,
    };
  }

  private trimComment(value: string | undefined): string | null {
    return value?.trim().length ? value.trim() : null;
  }
}
