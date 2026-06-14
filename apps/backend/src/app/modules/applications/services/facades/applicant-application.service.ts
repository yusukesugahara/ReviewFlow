import { Injectable } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import type {
  CorrectionTargetsResponseDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicantApplicationAccessService } from '../access/applicant-application-access.service';
import { ApplicationCorrectionService } from '../review/application-correction.service';
import { ApplicationCreationService } from '../creation/application-creation.service';
import { ApplicationFieldValuePatchService } from '../field-values/application-field-value-patch.service';
import { ApplicationProgressService } from '../progress/application-progress.service';
import { ApplicationSubmissionService } from '../submission/application-submission.service';

type ApplicantSession = ApplicantAccessTokenPayload;

@Injectable()
export class ApplicantApplicationService {
  constructor(
    private readonly applicantAccess: ApplicantApplicationAccessService,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly creationService: ApplicationCreationService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly progressService: ApplicationProgressService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async createAndSubmit(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    this.applicantAccess.assertCanCreateInGroup(actor, dto.groupId);
    const flow = await this.flowResolver.resolveDefaultActiveFlow(
      actor.tenantId,
      actor.groupId,
    );
    const created = await this.creationService.create(
      actor.tenantId,
      actor.email,
      null,
      {
        ...dto,
        formDefinitionId: actor.formDefinitionId ?? dto.formDefinitionId,
        approvalFlowId: flow.id,
        status: ApplicationStatus.DRAFT,
      },
    );
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_CREATED,
      actor: { id: null, email: actor.email, type: 'applicant' },
      app: created,
      after: {
        status: created.status,
        stepOrder: created.currentStepOrder,
      },
    });
    const before = this.snapshot(created);
    await this.submissionService.submit(actor.tenantId, created);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_SUBMITTED,
      actor: { id: null, email: actor.email, type: 'applicant' },
      app: created,
      before,
      after: this.snapshot(created),
    });
    const submitted = await this.applicantAccess.loadSubmittedApplication(
      actor.tenantId,
      created.id,
      {
        detail: true,
      },
    );
    return this.progressService.hydrate(submitted);
  }

  async getReturnedCorrection(
    actor: ApplicantSession,
  ): Promise<CorrectionTargetsResponseDto> {
    const applicationId =
      this.applicantAccess.getTokenApplicationIdOrThrow(actor);
    const app = await this.applicantAccess.loadEditableApplication(
      actor,
      applicationId,
    );
    return this.correctionService.buildTargetsResponse(app);
  }

  async patchReturned(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    const app = await this.applicantAccess.loadEditableApplication(actor, id);
    if (dto.formDefinitionId || dto.approvalFlowId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    const before = this.snapshot(app);
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_CORRECTED,
      actor: { id: null, email: actor.email, type: 'applicant' },
      app,
      before,
      after: this.snapshot(app),
      metadataJson: { fieldKeys: Object.keys(dto.values ?? {}) },
    });
    const updated = await this.applicantAccess.loadApplicationDetail(actor, id);
    return this.progressService.hydrate(updated);
  }

  async resubmit(actor: ApplicantSession, id: string): Promise<Application> {
    const app = await this.applicantAccess.loadEditableApplication(actor, id);
    const before = this.snapshot(app);
    await this.submissionService.resubmit(actor.tenantId, app);
    await this.auditLogs.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_RESUBMITTED,
      actor: { id: null, email: actor.email, type: 'applicant' },
      app,
      before,
      after: this.snapshot(app),
    });
    const updated = await this.applicantAccess.loadApplicationDetail(actor, id);
    return this.progressService.hydrate(updated);
  }

  private snapshot(app: Application) {
    return {
      status: app.status,
      stepOrder: app.currentStepOrder,
    };
  }
}
