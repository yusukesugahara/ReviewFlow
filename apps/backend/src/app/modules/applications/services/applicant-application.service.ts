import { Injectable } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import type {
  CorrectionTargetsResponseDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
} from '../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationFieldValuePatchService } from './application-field-value-patch.service';
import { ApplicationProgressService } from './application-progress.service';
import { ApplicationSubmissionService } from './application-submission.service';

type ApplicantSession = ApplicantAccessTokenPayload;

@Injectable()
export class ApplicantApplicationService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly creationService: ApplicationCreationService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly progressService: ApplicationProgressService,
    private readonly submissionService: ApplicationSubmissionService,
  ) {}

  async createAndSubmit(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    if (dto.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
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
    await this.submissionService.submit(actor.tenantId, created);
    const submitted = await this.loadApplicationOrThrow(
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
    if (!actor.applicationId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    const app = await this.loadApplicantEditableApplication(
      actor,
      actor.applicationId,
    );
    this.assertApplicantGroupMatches(actor, app);
    return this.correctionService.buildTargetsResponse(app);
  }

  async patchReturned(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    this.assertApplicantCanAccessApplication(actor, id);
    const app = await this.loadApplicantEditableApplication(actor, id);
    this.assertApplicantGroupMatches(actor, app);
    if (dto.formDefinitionId || dto.approvalFlowId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    const updated = await this.loadApplicantEditableApplication(actor, id);
    return this.progressService.hydrate(updated);
  }

  async resubmit(actor: ApplicantSession, id: string): Promise<Application> {
    this.assertApplicantCanAccessApplication(actor, id);
    const app = await this.loadApplicantEditableApplication(actor, id);
    this.assertApplicantGroupMatches(actor, app);
    await this.submissionService.resubmit(actor.tenantId, app);
    const updated = await this.loadApplicantEditableApplication(actor, id);
    return this.progressService.hydrate(updated);
  }

  private assertApplicantCanAccessApplication(
    actor: ApplicantSession,
    id: string,
  ): void {
    if (actor.applicationId && actor.applicationId !== id) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  private assertApplicantGroupMatches(
    actor: ApplicantSession,
    app: Application,
  ): void {
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    withRelations: { detail: boolean },
  ): Promise<Application> {
    const row = await this.queryRepository.findById({
      tenantId,
      id,
      detail: withRelations.detail,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
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
}
