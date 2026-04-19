import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { ApplicationApprovalAction } from '../../../models/constants/application-approval-action';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../models/constants/correction-request-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { UserRole } from '../../../models/constants/user-role';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import type {
  ApproveApplicationDto,
  CreateApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from './applications.dto';
import {
  mapApplicationToDetail,
  mapApplicationToSummary,
  mapCorrectionsList,
} from './applications.mapper';

@Injectable()
export class ApplicationsService {
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
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
  ) {}

  private valuePresent(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    if (typeof value === 'boolean') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  private assertValueMatchesFieldType(field: FormField, value: unknown): void {
    switch (field.fieldType) {
      case FormFieldType.TEXT:
      case FormFieldType.TEXTAREA:
      case FormFieldType.DATE:
      case FormFieldType.SELECT:
      case FormFieldType.RADIO:
        if (typeof value !== 'string') {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      case FormFieldType.NUMBER:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      case FormFieldType.CHECKBOX:
        if (
          !Array.isArray(value) ||
          !value.every((x) => typeof x === 'string')
        ) {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      default:
        throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
    }
  }

  private approverCanActOn(app: Application, userRole: string): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    const step = app.approvalFlow?.steps?.find(
      (s) => s.stepOrder === app.currentStepOrder,
    );
    if (!step) {
      return false;
    }
    return step.approverRole === userRole;
  }

  private canActorActOnReview(actor: AuthUserPayload, app: Application): boolean {
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      return false;
    }
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return true;
    }
    if (
      actor.roles.includes(UserRole.APPROVER) &&
      !actor.roles.includes(UserRole.TENANT_ADMIN)
    ) {
      return this.approverCanActOn(app, UserRole.APPROVER);
    }
    return false;
  }

  private async assertCanRead(
    actor: AuthUserPayload,
    app: Application,
  ): Promise<void> {
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    if (app.applicantUserId === actor.id) {
      return;
    }
    if (
      actor.roles.includes(UserRole.APPROVER) &&
      !actor.roles.includes(UserRole.TENANT_ADMIN)
    ) {
      if (this.approverCanActOn(app, UserRole.APPROVER)) {
        return;
      }
      if (app.status !== ApplicationStatus.DRAFT) {
        const participated = await this.approvals.count({
          where: { applicationId: app.id, actedByUserId: actor.id },
        });
        if (participated > 0) {
          return;
        }
      }
    }
    throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
  }

  private async resolveActiveFlow(
    tenantId: string,
    formTemplateId: string,
    approvalFlowId?: string,
  ): Promise<ApprovalFlow> {
    if (approvalFlowId) {
      const flow = await this.flows.findOne({
        where: {
          id: approvalFlowId,
          tenantId,
          formTemplateId,
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
      where: { tenantId, formTemplateId, isActive: true },
      relations: ['steps'],
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    if (list.length > 1) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FLOW_AMBIGUOUS);
    }
    return list[0]!;
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    withRelations: { detail: boolean },
  ): Promise<Application> {
    const relations = withRelations.detail
      ? ['fieldValues', 'fieldValues.formField', 'approvalFlow', 'approvalFlow.steps']
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

  async listForActor(actor: AuthUserPayload): Promise<Application[]> {
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return this.apps.find({
        where: { tenantId: actor.tenantId },
        order: { createdAt: 'DESC' },
      });
    }
    if (actor.roles.includes(UserRole.APPROVER)) {
      const rows = await this.apps.find({
        where: {
          tenantId: actor.tenantId,
          status: ApplicationStatus.IN_REVIEW,
        },
        relations: ['approvalFlow', 'approvalFlow.steps'],
        order: { createdAt: 'DESC' },
      });
      return rows.filter((a) => this.approverCanActOn(a, UserRole.APPROVER));
    }
    return this.apps.find({
      where: { tenantId: actor.tenantId, applicantUserId: actor.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const row = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.assertCanRead(actor, row);
    return row;
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const template = await this.templates.findOne({
      where: { id: dto.formTemplateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    if (template.status !== FormTemplateStatus.PUBLISHED) {
      throw clientError(ClientErrorCodes.APPLICATION_FORM_NOT_PUBLISHED);
    }

    const fieldsByKey = new Map(
      (template.fields ?? []).map((f) => [f.fieldKey, f]),
    );
    const values = dto.values ?? {};
    for (const key of Object.keys(values)) {
      const field = fieldsByKey.get(key);
      if (!field) {
        throw clientError(ClientErrorCodes.APPLICATION_FIELD_UNKNOWN);
      }
      this.assertValueMatchesFieldType(field, values[key]);
    }

    const flow = await this.resolveActiveFlow(
      actor.tenantId,
      template.id,
      dto.approvalFlowId,
    );

    let newId = '';
    await this.apps.manager.transaction(async (em) => {
      const appRepo = em.getRepository(Application);
      const valRepo = em.getRepository(ApplicationFieldValue);
      const app = appRepo.create({
        tenantId: actor.tenantId,
        applicantUserId: actor.id,
        formTemplateId: template.id,
        approvalFlowId: flow.id,
        status: ApplicationStatus.DRAFT,
        currentStepOrder: null,
        submittedAt: null,
      });
      const saved = await appRepo.save(app);
      newId = saved.id;
      for (const [key, val] of Object.entries(values)) {
        const field = fieldsByKey.get(key)!;
        await valRepo.save(
          valRepo.create({
            tenantId: actor.tenantId,
            applicationId: saved.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    });

    return this.getOneForActor(actor, newId);
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

  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    const app = await this.apps.findOne({
      where: {
        id,
        tenantId: actor.tenantId,
        applicantUserId: actor.id,
      },
      relations: ['fieldValues'],
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }

    const template = await this.templates.findOne({
      where: { id: app.formTemplateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    const fieldsByKey = new Map(
      (template.fields ?? []).map((f) => [f.fieldKey, f]),
    );

    if (app.status === ApplicationStatus.DRAFT) {
      /* continue normal patch */
    } else if (app.status === ApplicationStatus.RETURNED) {
      const open = await this.findOpenCorrection(app.id);
      if (!open?.items?.length) {
        throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
      }
      const allowed = new Set(open.items.map((i) => i.formFieldId));
      for (const key of Object.keys(dto.values)) {
        const field = fieldsByKey.get(key);
        if (!field) {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_UNKNOWN);
        }
        if (!allowed.has(field.id)) {
          throw clientError(
            ClientErrorCodes.APPLICATION_PATCH_FIELD_NOT_IN_CORRECTION,
          );
        }
        this.assertValueMatchesFieldType(field, dto.values[key]);
      }
    } else {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    for (const key of Object.keys(dto.values)) {
      const field = fieldsByKey.get(key);
      if (!field) {
        throw clientError(ClientErrorCodes.APPLICATION_FIELD_UNKNOWN);
      }
      this.assertValueMatchesFieldType(field, dto.values[key]);
    }

    for (const [key, val] of Object.entries(dto.values)) {
      const field = fieldsByKey.get(key)!;
      const existing = await this.fieldValues.findOne({
        where: { applicationId: app.id, formFieldId: field.id },
      });
      if (existing) {
        existing.valueJson = val;
        await this.fieldValues.save(existing);
      } else {
        await this.fieldValues.save(
          this.fieldValues.create({
            tenantId: actor.tenantId,
            applicationId: app.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    }

    return this.getOneForActor(actor, id);
  }

  private async assertRequiredSatisfied(
    app: Application,
    fields: FormField[],
  ): Promise<void> {
    const byFieldId = new Map(
      (app.fieldValues ?? []).map((v) => [v.formFieldId, v.valueJson]),
    );
    for (const f of fields) {
      if (!f.required) {
        continue;
      }
      const val = byFieldId.get(f.id);
      if (!this.valuePresent(val)) {
        throw clientError(ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING);
      }
      this.assertValueMatchesFieldType(f, val);
    }
  }

  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.apps.findOne({
      where: {
        id,
        tenantId: actor.tenantId,
        applicantUserId: actor.id,
      },
      relations: ['fieldValues'],
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    if (app.status !== ApplicationStatus.DRAFT) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_DRAFT);
    }

    const template = await this.templates.findOne({
      where: { id: app.formTemplateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }

    await this.assertRequiredSatisfied(app, template.fields ?? []);
    for (const fv of app.fieldValues ?? []) {
      const field = (template.fields ?? []).find((x) => x.id === fv.formFieldId);
      if (field) {
        this.assertValueMatchesFieldType(field, fv.valueJson);
      }
    }

    app.status = ApplicationStatus.IN_REVIEW;
    app.currentStepOrder = 1;
    app.submittedAt = new Date();
    await this.apps.save(app);

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
    if (!this.canActorActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_IN_REVIEW);
    }

    const steps = [...(app.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    const cur = steps.find((s) => s.stepOrder === app.currentStepOrder);
    if (!cur) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_STATE_INVALID);
    }
    const next = steps.find((s) => s.stepOrder === cur.stepOrder + 1);

    const comment =
      dto.comment?.trim().length ? dto.comment.trim() : null;

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
      if (!next) {
        app.status = ApplicationStatus.APPROVED;
        app.currentStepOrder = null;
      } else {
        app.currentStepOrder = next.stepOrder;
      }
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
    if (!this.canActorActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_IN_REVIEW);
    }

    const steps = [...(app.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    const cur = steps.find((s) => s.stepOrder === app.currentStepOrder);
    if (!cur) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_STATE_INVALID);
    }

    const comment =
      dto.comment?.trim().length ? dto.comment.trim() : null;

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
      app.status = ApplicationStatus.REJECTED;
      app.currentStepOrder = null;
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
    if (!this.canActorActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    if (app.status !== ApplicationStatus.IN_REVIEW) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_IN_REVIEW);
    }

    const steps = [...(app.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    const cur = steps.find((s) => s.stepOrder === app.currentStepOrder);
    if (!cur) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_STATE_INVALID);
    }
    if (!cur.canReturn) {
      throw clientError(ClientErrorCodes.APPLICATION_RETURN_NOT_ALLOWED);
    }

    const existingOpen = await this.findOpenCorrection(app.id);
    if (existingOpen) {
      throw clientError(ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN);
    }

    const template = await this.templates.findOne({
      where: { id: app.formTemplateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    const fieldIdsOnTemplate = new Set((template.fields ?? []).map((f) => f.id));

    for (const f of dto.fields) {
      if (!fieldIdsOnTemplate.has(f.fieldId)) {
        throw clientError(ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID);
      }
    }

    const overall =
      dto.overallComment?.trim().length ? dto.overallComment.trim() : null;

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

      app.status = ApplicationStatus.RETURNED;
      app.currentStepOrder = null;
      await appRepo.save(app);
    });

    return this.getOneForActor(actor, id);
  }

  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.apps.findOne({
      where: {
        id,
        tenantId: actor.tenantId,
        applicantUserId: actor.id,
      },
      relations: ['fieldValues'],
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    if (app.status !== ApplicationStatus.RETURNED) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_RETURNED);
    }

    const open = await this.correctionRequests.findOne({
      where: {
        applicationId: app.id,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
    if (!open) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.templates.findOne({
      where: { id: app.formTemplateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }

    await this.assertRequiredSatisfied(app, template.fields ?? []);
    for (const fv of app.fieldValues ?? []) {
      const field = (template.fields ?? []).find((x) => x.id === fv.formFieldId);
      if (field) {
        this.assertValueMatchesFieldType(field, fv.valueJson);
      }
    }

    await this.apps.manager.transaction(async (em) => {
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      open.status = CorrectionRequestStatus.RESOLVED;
      open.resolvedAt = new Date();
      await corrRepo.save(open);

      for (const it of open.items ?? []) {
        it.isResolved = true;
        await itemRepo.save(it);
      }

      app.status = ApplicationStatus.IN_REVIEW;
      app.currentStepOrder = 1;
      await appRepo.save(app);
    });

    return this.getOneForActor(actor, id);
  }

  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: false,
    });
    await this.assertCanRead(actor, app);

    const rows = await this.correctionRequests.find({
      where: { applicationId: app.id, tenantId: actor.tenantId },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
    return mapCorrectionsList(rows);
  }

  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }
}
