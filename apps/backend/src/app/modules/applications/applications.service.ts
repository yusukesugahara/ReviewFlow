import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import type { ApplicantAccessTokenPayload } from '../auth/auth.service';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { ApplicationApprovalAction } from '../../../models/constants/application-approval-action';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../models/constants/correction-request-status';
import { FormDefinitionStatus } from '../../../models/constants/form-definition-status';
import { UserRole } from '../../../models/constants/user-role';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import type { FormField } from '../../../models/entities/form-field.entity';
import { SpaceAccessService } from '../groups/space-access.service';
import { MailService } from '../mail/mail.service';
import type {
  ApproveApplicationDto,
  CorrectionTargetsResponseDto,
  CreateApplicationDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from './applications.dto';
import {
  mapApplicationToDetail,
  mapApplicationToSummary,
  mapCorrectionsList,
} from './applications.mapper';
import { ApplicationAccessPolicy } from './application-access.policy';
import { ApplicationFormValueValidator } from './application-form-value.validator';
import { ApplicationTransitionPolicy } from './application-transition.policy';

type ApplicantSession = ApplicantAccessTokenPayload;
type EditablePatchContext = {
  app: Application;
  fieldsByKey: Map<string, FormField>;
  allowedFieldIds?: Set<string>;
};
type SubmittableApplicationContext = {
  app: Application;
  template: FormDefinition;
};
type ResubmittableApplicationContext = SubmittableApplicationContext & {
  openCorrection: CorrectionRequest;
};

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
    @InjectRepository(ApplicationFieldValue)
    private readonly fieldValues: Repository<ApplicationFieldValue>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
    @InjectRepository(CorrectionRequestItem)
    private readonly correctionItems: Repository<CorrectionRequestItem>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
    private readonly spaceAccess: SpaceAccessService,
    private readonly mailService: MailService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly formValueValidator: ApplicationFormValueValidator,
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

  private async resolveActiveFlow(
    tenantId: string,
    groupId: string,
    approvalFlowId?: string,
  ): Promise<ApprovalFlow> {
    if (approvalFlowId) {
      const flow = await this.flows.findOne({
        where: {
          id: approvalFlowId,
          tenantId,
          groupId,
          isActive: true,
        },
        relations: ['steps'],
      });
      if (!flow) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
      }
      return flow;
    }
    const list = await this.flows.find({
      where: { tenantId, groupId, isActive: true },
      relations: ['steps'],
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    if (list.length > 1) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FLOW_AMBIGUOUS);
    }
    return list[0];
  }

  private async resolveDefaultActiveFlow(
    tenantId: string,
    groupId: string,
  ): Promise<ApprovalFlow> {
    const list = await this.flows.find({
      where: { tenantId, groupId, isActive: true },
      relations: ['steps'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    return list[0];
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
          'approvalFlow',
          'approvalFlow.steps',
        ]
      : ['approvalFlow', 'approvalFlow.steps'];
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
      return row;
    }
    await this.accessPolicy.assertCanRead(
      actor,
      row,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );
    return row;
  }

  private async createInternal(
    tenantId: string,
    applicantEmail: string,
    applicantUserId: string | null,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const template = await this.resolvePublishedTemplate(tenantId, dto);
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const values = dto.values ?? {};
    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    this.formValueValidator.assertValuesMatchFields(fieldsByKey, values);

    const flow = await this.resolveActiveFlow(
      tenantId,
      dto.groupId,
      dto.approvalFlowId,
    );

    let newId = '';
    await this.apps.manager.transaction(async (em) => {
      const appRepo = em.getRepository(Application);
      const valRepo = em.getRepository(ApplicationFieldValue);
      const app = appRepo.create({
        tenantId,
        groupId: dto.groupId,
        applicantUserId,
        applicantEmail,
        formDefinitionId: template.id,
        approvalFlowId: flow.id,
        status:
          dto.status === ApplicationStatus.PUBLISHED
            ? ApplicationStatus.PUBLISHED
            : ApplicationStatus.DRAFT,
        currentStepOrder: null,
        submittedAt: null,
      });
      const saved = await appRepo.save(app);
      newId = saved.id;
      for (const [key, val] of Object.entries(values)) {
        const field = this.formValueValidator.getKnownField(fieldsByKey, key);
        await valRepo.save(
          valRepo.create({
            tenantId,
            applicationId: saved.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    });

    const created = await this.loadApplicationOrThrow(tenantId, newId, {
      detail: true,
    });
    return created;
  }

  private async resolvePublishedTemplate(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<FormDefinition | null> {
    if (dto.formDefinitionId) {
      return this.templates.findOne({
        where: {
          id: dto.formDefinitionId,
          tenantId,
          groupId: dto.groupId,
          status: FormDefinitionStatus.PUBLISHED,
        },
        relations: ['fields'],
      });
    }

    const templates = await this.templates.find({
      where: {
        tenantId,
        groupId: dto.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
    if (templates.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    return templates[0] ?? null;
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    await this.spaceAccess.assertCanUseGroup(actor, dto.groupId);
    return this.createInternal(actor.tenantId, actor.email, actor.id, dto);
  }

  async createAndSubmitForApplicant(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    if (dto.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
    const flow = await this.resolveDefaultActiveFlow(
      actor.tenantId,
      actor.groupId,
    );
    const created = await this.createInternal(
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
    const context = await this.loadSubmittableApplicationContext(
      actor.tenantId,
      created,
    );
    this.validateApplicationReadyToSubmit(context);
    await this.applySubmitTransition(context);
    return this.loadApplicationOrThrow(actor.tenantId, created.id, {
      detail: true,
    });
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

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: {
        applicationId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
  }

  private async loadEditablePatchContext(
    tenantId: string,
    app: Application,
    formDefinitionId?: string,
  ): Promise<EditablePatchContext> {
    if (
      formDefinitionId &&
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.PUBLISHED
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    const template = await this.templates.findOne({
      where: {
        id: formDefinitionId ?? app.formDefinitionId,
        tenantId,
        groupId: app.groupId,
        ...(formDefinitionId ? { status: FormDefinitionStatus.PUBLISHED } : {}),
      },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    let allowedFieldIds: Set<string> | undefined;

    if (app.status === ApplicationStatus.RETURNED) {
      const open = await this.findOpenCorrection(app.id);
      if (!open?.items?.length) {
        throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
      }
      allowedFieldIds = new Set(open.items.map((i) => i.formFieldId));
    } else if (
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.PUBLISHED
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    return { app, fieldsByKey, allowedFieldIds };
  }

  private async applyFieldValuePatch(
    context: EditablePatchContext,
    values: Record<string, unknown>,
  ): Promise<ApplicationFieldValue[]> {
    this.formValueValidator.assertPatchValuesMatchFields(
      context.fieldsByKey,
      values,
      context.allowedFieldIds,
    );

    const existingValues = await this.fieldValues.find({
      where: { applicationId: context.app.id },
    });
    const existingByFieldId = new Map(
      existingValues.map((value) => [value.formFieldId, value]),
    );
    const patchedValues: ApplicationFieldValue[] = [];

    for (const [key, val] of Object.entries(values)) {
      const field = this.formValueValidator.getKnownField(
        context.fieldsByKey,
        key,
      );
      const existing = existingByFieldId.get(field.id);
      if (existing) {
        existing.valueJson = val;
        patchedValues.push(existing);
      } else {
        patchedValues.push(
          this.fieldValues.create({
            tenantId: context.app.tenantId,
            applicationId: context.app.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    }

    return patchedValues;
  }

  private async saveApplicationPatch(
    app: Application,
    dto: PatchApplicationDto,
    values: ApplicationFieldValue[],
  ): Promise<void> {
    if (!dto.formDefinitionId && !dto.approvalFlowId && values.length === 0) {
      return;
    }
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const appRepo = em.getRepository(Application);
      const valueRepo = em.getRepository(ApplicationFieldValue);
      if (dto.formDefinitionId) {
        app.formDefinitionId = dto.formDefinitionId;
        await valueRepo.delete({ applicationId: app.id });
      }
      if (dto.approvalFlowId) {
        app.approvalFlowId = dto.approvalFlowId;
      }
      if (dto.formDefinitionId || dto.approvalFlowId) {
        await appRepo.save(app);
      }
      if (values.length > 0) {
        await valueRepo.save(values);
      }
    });
  }

  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    if (dto.approvalFlowId) {
      await this.resolveActiveFlow(
        actor.tenantId,
        app.groupId,
        dto.approvalFlowId,
      );
    }
    const context = await this.loadEditablePatchContext(
      actor.tenantId,
      app,
      dto.formDefinitionId,
    );
    const fieldValues = await this.applyFieldValuePatch(
      context,
      dto.values ?? {},
    );
    await this.saveApplicationPatch(app, dto, fieldValues);
    return this.getOneForActor(actor, id);
  }

  private async loadSubmittableApplicationContext(
    tenantId: string,
    app: Application,
  ): Promise<SubmittableApplicationContext> {
    this.transitionPolicy.assertDraft(app);

    const template = await this.templates.findOne({
      where: { id: app.formDefinitionId, tenantId, groupId: app.groupId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return { app, template };
  }

  private validateApplicationReadyToSubmit(
    context: SubmittableApplicationContext,
  ): void {
    this.formValueValidator.assertApplicationValuesSubmittable(
      context.app,
      context.template.fields ?? [],
    );
  }

  private async saveSubmittedApplication(app: Application): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      await em.getRepository(Application).save(app);
    });
  }

  private async applySubmitTransition(
    context: SubmittableApplicationContext,
  ): Promise<void> {
    this.transitionPolicy.startReview(context.app);
    await this.saveSubmittedApplication(context.app);
  }

  private async loadResubmittableApplicationContext(
    tenantId: string,
    app: Application,
  ): Promise<ResubmittableApplicationContext> {
    this.transitionPolicy.assertReturned(app);

    const openCorrection = await this.correctionRequests.findOne({
      where: {
        applicationId: app.id,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.templates.findOne({
      where: { id: app.formDefinitionId, tenantId, groupId: app.groupId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return { app, template, openCorrection };
  }

  private async applyResubmitTransition(
    context: ResubmittableApplicationContext,
  ): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      context.openCorrection.status = CorrectionRequestStatus.RESOLVED;
      context.openCorrection.resolvedAt = new Date();
      await corrRepo.save(context.openCorrection);

      for (const it of context.openCorrection.items ?? []) {
        it.isResolved = true;
        await itemRepo.save(it);
      }

      this.transitionPolicy.applyResubmit(context.app);
      await appRepo.save(context.app);
    });
  }

  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const context = await this.loadSubmittableApplicationContext(
      actor.tenantId,
      app,
    );
    this.validateApplicationReadyToSubmit(context);
    await this.applySubmitTransition(context);
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
    const cur = this.transitionPolicy.getCurrentStep(app);
    const next = this.transitionPolicy.getNextStep(app, cur);

    const comment = dto.comment?.trim().length ? dto.comment.trim() : null;

    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const appRepo = em.getRepository(Application);
      await approvalRepo.save(
        approvalRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actor.id,
          action: ApplicationApprovalAction.APPROVED,
          comment,
        }),
      );
      this.transitionPolicy.applyApproval(app, next);
      await appRepo.save(app);
    });

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
    const cur = this.transitionPolicy.getCurrentStep(app);

    const comment = dto.comment?.trim().length ? dto.comment.trim() : null;

    await this.apps.manager.transaction(async (em) => {
      await em.getRepository(ApplicationApproval).save(
        em.getRepository(ApplicationApproval).create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actor.id,
          action: ApplicationApprovalAction.REJECTED,
          comment,
        }),
      );
      this.transitionPolicy.applyReject(app);
      await em.getRepository(Application).save(app);
    });

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
    const cur = this.transitionPolicy.getCurrentStep(app);
    this.transitionPolicy.assertStepCanReturn(cur);

    const existingOpen = await this.findOpenCorrection(app.id);
    if (existingOpen) {
      throw clientError(ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN);
    }

    const template = await this.templates.findOne({
      where: {
        id: app.formDefinitionId,
        tenantId: actor.tenantId,
        groupId: app.groupId,
      },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    const fieldIdsOnTemplate = new Set(
      (template.fields ?? []).map((f) => f.id),
    );

    for (const f of dto.fields) {
      if (!fieldIdsOnTemplate.has(f.fieldId)) {
        throw clientError(ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID);
      }
    }

    const overall = dto.overallComment?.trim().length
      ? dto.overallComment.trim()
      : null;

    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      await approvalRepo.save(
        approvalRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actor.id,
          action: ApplicationApprovalAction.RETURNED,
          comment: overall,
        }),
      );

      const cr = await corrRepo.save(
        corrRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          requestedByUserId: actor.id,
          status: CorrectionRequestStatus.OPEN,
          overallComment: overall,
          resolvedAt: null,
        }),
      );

      for (const row of dto.fields) {
        await itemRepo.save(
          itemRepo.create({
            tenantId: app.tenantId,
            correctionRequestId: cr.id,
            formFieldId: row.fieldId,
            comment: row.comment?.trim().length ? row.comment.trim() : null,
            isResolved: false,
          }),
        );
      }

      this.transitionPolicy.applyReturn(app);
      await appRepo.save(app);
    });

    await this.notifyApplicantOfReturn(app, template, dto);

    return this.getOneForActor(actor, id);
  }

  private async notifyApplicantOfReturn(
    app: Application,
    template: FormDefinition,
    dto: ReturnApplicationDto,
  ): Promise<void> {
    const fieldsById = new Map((template.fields ?? []).map((f) => [f.id, f]));
    try {
      await this.mailService.sendApplicationReturnedEmail({
        to: app.applicantEmail,
        applicationId: app.id,
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

  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicantEditableApplication(actor, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const context = await this.loadResubmittableApplicationContext(
      actor.tenantId,
      app,
    );
    this.validateApplicationReadyToSubmit(context);
    await this.applyResubmitTransition(context);
    return this.getOneForActor(actor, id);
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

    const rows = await this.correctionRequests.find({
      where: { applicationId: app.id, tenantId: actor.tenantId },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
    return mapCorrectionsList(rows);
  }

  private async findOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    const opens = await this.correctionRequests.find({
      where: {
        applicationId,
        tenantId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
    return opens[0] ?? null;
  }

  private async buildCorrectionTargetsResponse(
    app: Application,
  ): Promise<CorrectionTargetsResponseDto> {
    const open = await this.findOpenCorrectionWithItems(app.tenantId, app.id);

    if (!open) {
      return {
        applicationId: app.id,
        applicationStatus: app.status,
        openCorrection: null,
      };
    }

    const valueByFieldId = new Map(
      (app.fieldValues ?? []).map((v) => [v.formFieldId, v.valueJson]),
    );

    const items = (open.items ?? []).map((it) => {
      const ff = it.formField;
      return {
        itemId: it.id,
        formFieldId: it.formFieldId,
        fieldKey: ff?.fieldKey ?? '',
        label: ff?.label ?? '',
        fieldType: ff?.fieldType ?? '',
        required: ff?.required ?? false,
        comment: it.comment,
        currentValue: valueByFieldId.has(it.formFieldId)
          ? valueByFieldId.get(it.formFieldId)
          : null,
      };
    });

    return {
      applicationId: app.id,
      applicationStatus: app.status,
      openCorrection: {
        id: open.id,
        overallComment: open.overallComment,
        createdAt: open.createdAt.toISOString(),
        items,
      },
    };
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

    return this.buildCorrectionTargetsResponse(app);
  }

  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }
}
