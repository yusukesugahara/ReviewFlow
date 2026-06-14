import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { PatchApplicationDto } from '../../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicationFieldValuePatchService } from '../field-values/application-field-value-patch.service';
import { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationSubmissionService } from '../submission/application-submission.service';

@Injectable()
export class ApplicationUserSubmissionUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly queryService: ApplicationQueryService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    if (dto.approvalFlowId) {
      await this.flowResolver.resolveActiveFlow(
        actor.tenantId,
        app.groupId,
        dto.approvalFlowId,
      );
    }
    const before = this.snapshot(app);
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    if (before.status === ApplicationStatus.RETURNED) {
      await this.auditLogs.recordApplicationEvent({
        actionType: BusinessAuditAction.APPLICATION_CORRECTED,
        actor: { id: actor.id ?? null, email: actor.email, type: 'user' },
        app,
        before,
        after: this.snapshot(app),
        metadataJson: { fieldKeys: Object.keys(dto.values ?? {}) },
      });
    }
    return this.queryService.getOneForActor(actor, id);
  }

  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const before = this.snapshot(app);
    await this.submissionService.submit(actor.tenantId, app);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_SUBMITTED,
      actor: { id: actor.id, email: actor.email, type: 'user' },
      app,
      before,
      after: this.snapshot(app),
    });
    return this.queryService.getOneForActor(actor, id);
  }

  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const before = this.snapshot(app);
    await this.submissionService.resubmit(actor.tenantId, app);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_RESUBMITTED,
      actor: { id: actor.id, email: actor.email, type: 'user' },
      app,
      before,
      after: this.snapshot(app),
    });
    return this.queryService.getOneForActor(actor, id);
  }

  private async loadApplicantEditableApplication(
    actor: { tenantId: string; id?: string; email: string },
    id: string,
  ): Promise<Application> {
    const app = await this.queryRepository.findApplicantEditable({
      id,
      tenantId: actor.tenantId,
      applicantUserId: actor.id,
      applicantEmail: actor.email,
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return app;
  }

  private snapshot(app: Application) {
    return {
      status: app.status,
      stepOrder: app.currentStepOrder,
    };
  }
}
