import { Injectable } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type {
  CorrectionTargetsResponseDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
} from '../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicantApplicationAccessService } from './applicant-application-access.service';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationFieldValuePatchService } from './application-field-value-patch.service';
import { ApplicationProgressService } from './application-progress.service';
import { ApplicationSubmissionService } from './application-submission.service';

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
    await this.submissionService.submit(actor.tenantId, created);
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
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    const updated = await this.applicantAccess.loadEditableApplication(
      actor,
      id,
    );
    return this.progressService.hydrate(updated);
  }

  async resubmit(actor: ApplicantSession, id: string): Promise<Application> {
    const app = await this.applicantAccess.loadEditableApplication(actor, id);
    await this.submissionService.resubmit(actor.tenantId, app);
    const updated = await this.applicantAccess.loadEditableApplication(
      actor,
      id,
    );
    return this.progressService.hydrate(updated);
  }
}
