import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import {
  AuthService,
  type ApplicantAccessTokenPayload,
} from '../../auth/services/auth.service';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import { ApplicationApproval } from '../../../../models/entities/application-approval.entity';
import { Application } from '../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { MailService } from '../../mail/services/mail.service';
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
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationFieldValuePatchService } from './application-field-value-patch.service';
import { ApplicationProgressService } from './application-progress.service';
import { ApplicationReviewActionService } from './application-review-action.service';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

type ApplicantSession = ApplicantAccessTokenPayload;

function isSetupApplication(app: Application): boolean {
  return (
    app.status === ApplicationStatus.DRAFT ||
    app.status === ApplicationStatus.PUBLISHED
  );
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    private readonly authService: AuthService,
    private readonly spaceAccess: SpaceAccessService,
    private readonly mailService: MailService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly creationService: ApplicationCreationService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly progressService: ApplicationProgressService,
    private readonly reviewActionService: ApplicationReviewActionService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  private countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.approvals.count({
      where: { applicationId, actedByUserId: actorId },
    });
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    withRelations: { detail: boolean },
  ): Promise<Application> {
    const relations = withRelations.detail
      ? [
          'fieldValues',
          'fieldValues.formField',
          'formDefinition',
          'approvalFlow',
          'approvalFlow.steps',
        ]
      : ['formDefinition', 'approvalFlow', 'approvalFlow.steps'];
    const row = await this.apps.findOne({
      where: { id, tenantId },
      relations,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    if (row.approvalFlow?.steps?.length) {
      row.approvalFlow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    }
    return row;
  }

  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    await this.spaceAccess.assertCanUseGroup(actor, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      const rows = await this.apps.find({
        where: { tenantId: actor.tenantId, groupId },
        relations: ['formDefinition'],
        order: { createdAt: 'DESC' },
      });
      return this.hydrateListFormDefinitions(actor.tenantId, rows);
    }
    const rows = await this.apps.find({
      where: { tenantId: actor.tenantId, groupId },
      relations: ['approvalFlow', 'approvalFlow.steps', 'formDefinition'],
      order: { createdAt: 'DESC' },
    });
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      groupId,
    );
    const visibleRows = rows.filter(
      (app) =>
        app.applicantUserId === actor.id ||
        this.accessPolicy.actorIsAssignedToCurrentStep(actor, app) ||
        (canManageGroup && isSetupApplication(app)),
    );
    return this.hydrateListFormDefinitions(actor.tenantId, visibleRows);
  }

  private async hydrateListFormDefinitions(
    tenantId: string,
    rows: Application[],
  ): Promise<Application[]> {
    const missingDefinitionIds = Array.from(
      new Set(
        rows
          .filter((row) => !row.formDefinition)
          .map((row) => row.formDefinitionId),
      ),
    );
    if (missingDefinitionIds.length === 0) {
      return rows;
    }
    const definitions = await this.templates.find({
      where: { tenantId, id: In(missingDefinitionIds) },
    });
    const definitionById = new Map(
      definitions.map((definition) => [definition.id, definition]),
    );
    for (const row of rows) {
      const definition = definitionById.get(row.formDefinitionId);
      if (definition) {
        row.formDefinition = definition;
      }
    }
    return rows;
  }

  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const row = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.spaceAccess.assertCanUseGroup(actor, row.groupId);
    if (
      isSetupApplication(row) &&
      (await this.spaceAccess.actorCanManageGroup(actor, row.groupId))
    ) {
      return this.progressService.hydrate(row);
    }
    await this.accessPolicy.assertCanRead(
      actor,
      row,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );
    return this.progressService.hydrate(row);
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

  private async loadApplicantEditableApplication(
    actor: { tenantId: string; id?: string; email: string },
    id: string,
  ): Promise<Application> {
    const app = await this.apps.findOne({
      where: {
        id,
        tenantId: actor.tenantId,
        ...(actor.id
          ? { applicantUserId: actor.id }
          : { applicantEmail: actor.email }),
      },
      relations: ['fieldValues'],
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return app;
  }

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
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    return this.getOneForActor(actor, id);
  }

  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.submissionService.submit(actor.tenantId, app);
    return this.getOneForActor(actor, id);
  }

  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    if (!canManageGroup && !this.accessPolicy.canActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    await this.reviewActionService.approve(app, actor.id, dto);
    return this.getOneForActor(actor, id);
  }

  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    if (!canManageGroup && !this.accessPolicy.canActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    await this.reviewActionService.reject(app, actor.id, dto);
    return this.getOneForActor(actor, id);
  }

  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    if (!canManageGroup && !this.accessPolicy.canActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    const template = await this.reviewActionService.returnForCorrection(
      app,
      actor.id,
      dto,
    );
    await this.notifyApplicantOfReturn(app, template, dto);

    return this.getOneForActor(actor, id);
  }

  private async notifyApplicantOfReturn(
    app: Application,
    template: FormDefinition,
    dto: ReturnApplicationDto,
  ): Promise<void> {
    const fieldsById = new Map((template.fields ?? []).map((f) => [f.id, f]));
    const accessToken = this.authService.issueApplicantAccessToken({
      tenantId: app.tenantId,
      email: app.applicantEmail,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
      applicationId: app.id,
    });
    try {
      await this.mailService.sendApplicationReturnedEmail({
        to: app.applicantEmail,
        applicationId: app.id,
        accessToken,
        groupId: app.groupId,
        templateName: template.name,
        overallComment: dto.overallComment ?? null,
        fields: dto.fields.map((field) => ({
          label: fieldsById.get(field.fieldId)?.label ?? field.fieldId,
          comment: field.comment ?? null,
        })),
      });
    } catch (error) {
      this.logger.error(
        `failed to send application return email for application ${app.id} to ${app.applicantEmail}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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
    await this.notifyApplicantOfReturn(app, context.template, context.dto);

    return this.getOneForActor(actor, id);
  }

  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.submissionService.resubmit(actor.tenantId, app);
    return this.getOneForActor(actor, id);
  }

  private assertApplicantCanAccessApplication(
    actor: ApplicantSession,
    id: string,
  ): void {
    if (actor.applicationId && actor.applicationId !== id) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  async getReturnedCorrectionForApplicant(
    actor: ApplicantSession,
  ): Promise<CorrectionTargetsResponseDto> {
    if (!actor.applicationId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    const app = await this.loadApplicantEditableApplication(
      actor,
      actor.applicationId,
    );
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
    return this.correctionService.buildTargetsResponse(app);
  }

  async patchReturnedForApplicant(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    this.assertApplicantCanAccessApplication(actor, id);
    const app = await this.loadApplicantEditableApplication(actor, id);
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
    if (dto.formDefinitionId || dto.approvalFlowId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    await this.fieldValuePatchService.applyPatch(actor.tenantId, app, dto);
    const updated = await this.loadApplicantEditableApplication(actor, id);
    return this.progressService.hydrate(updated);
  }

  async resubmitForApplicant(
    actor: ApplicantSession,
    id: string,
  ): Promise<Application> {
    this.assertApplicantCanAccessApplication(actor, id);
    const app = await this.loadApplicantEditableApplication(actor, id);
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
    await this.submissionService.resubmit(actor.tenantId, app);
    const updated = await this.loadApplicantEditableApplication(actor, id);
    return this.progressService.hydrate(updated);
  }

  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: false,
    });
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );

    return this.correctionService.listCorrections(actor.tenantId, app);
  }

  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    const app = await this.loadApplicationOrThrow(
      actor.tenantId,
      applicationId,
      {
        detail: true,
      },
    );
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );

    return this.correctionService.buildTargetsResponse(app);
  }

  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }
}
