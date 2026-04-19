import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { UserRole } from '../../../models/constants/user-role';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import type { CreateApplicationDto, PatchApplicationDto } from './applications.dto';
import { mapApplicationToDetail, mapApplicationToSummary } from './applications.mapper';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationFieldValue)
    private readonly fieldValues: Repository<ApplicationFieldValue>,
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

  private assertCanRead(actor: AuthUserPayload, app: Application): void {
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
    this.assertCanRead(actor, row);
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
    if (app.status !== ApplicationStatus.DRAFT) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
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

  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }
}
