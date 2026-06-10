import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { Application } from '../../../../models/entities/application.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type {
  ApproveApplicationDto,
  CorrectionTargetsResponseDto,
  CreateApplicationDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import {
  mapApplicationToDetail,
  mapApplicationToSummary,
} from '../mappers/applications.mapper';
import { ApplicationAccessPolicy } from '../policies/application-access.policy';
import { ApplicantApplicationService } from './applicant-application.service';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationNotificationService } from './application-notification.service';
import { ApplicationQueryService } from './application-query.service';
import { ApplicationReviewUseCaseService } from './application-review-use-case.service';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';
import { ApplicationUserSubmissionUseCaseService } from './application-user-submission-use-case.service';

type ApplicantSession = ApplicantAccessTokenPayload;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicantApplicationService: ApplicantApplicationService,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly creationService: ApplicationCreationService,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly reviewUseCaseService: ApplicationReviewUseCaseService,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
    private readonly userSubmissionUseCaseService: ApplicationUserSubmissionUseCaseService,
  ) {}

  private countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.applicationsRepository.countApprovalsByActor(
      applicationId,
      actorId,
    );
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    withRelations: { detail: boolean },
  ): Promise<Application> {
    const row = await this.applicationsRepository.findById({
      tenantId,
      id,
      detail: withRelations.detail,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }

  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    return this.queryService.listForActor(actor, groupId);
  }

  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    return this.queryService.getOneForActor(actor, id);
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    await this.spaceAccess.assertCanUseGroup(actor, dto.groupId);
    return this.creationService.create(
      actor.tenantId,
      actor.email,
      actor.id,
      dto,
    );
  }

  async createAndSubmitForApplicant(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    return this.applicantApplicationService.createAndSubmit(actor, dto);
  }

  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    return this.userSubmissionUseCaseService.patch(actor, id, dto);
  }

  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    return this.userSubmissionUseCaseService.submit(actor, id);
  }

  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.approve(actor, id, dto);
  }

  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.reject(actor, id, dto);
  }

  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.returnApplication(actor, id, dto);
  }

  async resendReturnEmail(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
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

    return this.getOneForActor(actor, id);
  }

  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    return this.userSubmissionUseCaseService.resubmit(actor, id);
  }

  async getReturnedCorrectionForApplicant(
    actor: ApplicantSession,
  ): Promise<CorrectionTargetsResponseDto> {
    return this.applicantApplicationService.getReturnedCorrection(actor);
  }

  async patchReturnedForApplicant(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    return this.applicantApplicationService.patchReturned(actor, id, dto);
  }

  async resubmitForApplicant(
    actor: ApplicantSession,
    id: string,
  ): Promise<Application> {
    return this.applicantApplicationService.resubmit(actor, id);
  }

  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    return this.queryService.getCorrectionsForActor(actor, id);
  }

  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    return this.queryService.getCorrectionTargetsForActor(actor, applicationId);
  }

  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }
}
