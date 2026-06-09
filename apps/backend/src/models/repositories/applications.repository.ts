import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  ApplicationApprovalAction,
  type ApplicationApprovalActionValue,
} from '../constants/application-approval-action';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../constants/application-status';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';

export type CreateApplicationValue = {
  formFieldId: string;
  valueJson: unknown;
};

@Injectable()
export class ApplicationsRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(ApplicationFieldValue)
    private readonly fieldValues: Repository<ApplicationFieldValue>,
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    @InjectRepository(ApprovalFlow)
    private readonly approvalFlows: Repository<ApprovalFlow>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.approvals.count({
      where: { applicationId, actedByUserId: actorId },
    });
  }

  async findById(params: {
    tenantId: string;
    id: string;
    detail: boolean;
  }): Promise<Application | null> {
    const relations = params.detail
      ? [
          'fieldValues',
          'fieldValues.formField',
          'formDefinition',
          'approvalFlow',
          'approvalFlow.steps',
        ]
      : ['formDefinition', 'approvalFlow', 'approvalFlow.steps'];
    const row = await this.apps.findOne({
      where: { id: params.id, tenantId: params.tenantId },
      relations,
    });
    sortApprovalFlowSteps(row);
    return row;
  }

  listForTenantAdmin(
    tenantId: string,
    groupId: string,
  ): Promise<Application[]> {
    return this.apps.find({
      where: { tenantId, groupId },
      relations: ['approvalFlow', 'approvalFlow.steps', 'formDefinition'],
      order: { createdAt: 'DESC' },
    });
  }

  async listForGroup(
    tenantId: string,
    groupId: string,
  ): Promise<Application[]> {
    const rows = await this.apps.find({
      where: { tenantId, groupId },
      relations: ['approvalFlow', 'approvalFlow.steps', 'formDefinition'],
      order: { createdAt: 'DESC' },
    });
    rows.forEach(sortApprovalFlowSteps);
    return rows;
  }

  async hydrateFormDefinitions(
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

  findApplicantEditable(params: {
    tenantId: string;
    id: string;
    applicantUserId?: string;
    applicantEmail: string;
  }): Promise<Application | null> {
    return this.apps.findOne({
      where: {
        id: params.id,
        tenantId: params.tenantId,
        ...(params.applicantUserId
          ? { applicantUserId: params.applicantUserId }
          : { applicantEmail: params.applicantEmail }),
      },
      relations: ['fieldValues'],
    });
  }

  findPublishedTemplate(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition | null> | Promise<FormDefinition[]> {
    if (params.formDefinitionId) {
      return this.templates.findOne({
        where: {
          id: params.formDefinitionId,
          tenantId: params.tenantId,
          groupId: params.groupId,
          status: FormDefinitionStatus.PUBLISHED,
        },
        relations: ['fields'],
      });
    }
    return this.templates.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  }

  findTemplateByIdInGroup(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId: string;
    onlyPublished?: boolean;
  }): Promise<FormDefinition | null> {
    return this.templates.findOne({
      where: {
        id: params.formDefinitionId,
        tenantId: params.tenantId,
        groupId: params.groupId,
        ...(params.onlyPublished
          ? { status: FormDefinitionStatus.PUBLISHED }
          : {}),
      },
      relations: ['fields'],
    });
  }

  async createApplicationWithValues(params: {
    tenantId: string;
    groupId: string;
    applicantUserId: string | null;
    applicantEmail: string;
    formDefinitionId: string;
    approvalFlowId: string;
    status: ApplicationStatusValue;
    values: CreateApplicationValue[];
  }): Promise<string> {
    let newId = '';
    await this.apps.manager.transaction(async (em) => {
      const appRepo = em.getRepository(Application);
      const valRepo = em.getRepository(ApplicationFieldValue);
      const app = appRepo.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        applicantUserId: params.applicantUserId,
        applicantEmail: params.applicantEmail,
        formDefinitionId: params.formDefinitionId,
        approvalFlowId: params.approvalFlowId,
        status:
          params.status === ApplicationStatus.PUBLISHED
            ? ApplicationStatus.PUBLISHED
            : ApplicationStatus.DRAFT,
        currentStepOrder: null,
        submittedAt: null,
      });
      const saved = await appRepo.save(app);
      newId = saved.id;
      for (const value of params.values) {
        await valRepo.save(
          valRepo.create({
            tenantId: params.tenantId,
            applicationId: saved.id,
            formFieldId: value.formFieldId,
            valueJson: value.valueJson,
          }),
        );
      }
    });
    return newId;
  }

  findCreatedApplication(
    tenantId: string,
    id: string,
  ): Promise<Application | null> {
    return this.apps.findOne({
      where: { id, tenantId },
      relations: [
        'fieldValues',
        'fieldValues.formField',
        'formDefinition',
        'approvalFlow',
        'approvalFlow.steps',
      ],
    });
  }

  findOpenCorrection(applicationId: string): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: { applicationId, status: CorrectionRequestStatus.OPEN },
      relations: ['items'],
    });
  }

  findExistingFieldValues(
    applicationId: string,
  ): Promise<ApplicationFieldValue[]> {
    return this.fieldValues.find({ where: { applicationId } });
  }

  createFieldValue(params: {
    tenantId: string;
    applicationId: string;
    formFieldId: string;
    valueJson: unknown;
  }): ApplicationFieldValue {
    return this.fieldValues.create(params);
  }

  async saveApplicationPatch(params: {
    app: Application;
    formDefinitionId?: string;
    approvalFlowId?: string;
    status?: ApplicationStatusValue;
    values: ApplicationFieldValue[];
  }): Promise<void> {
    if (
      !params.formDefinitionId &&
      !params.approvalFlowId &&
      !params.status &&
      params.values.length === 0
    ) {
      return;
    }
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const appRepo = em.getRepository(Application);
      const valueRepo = em.getRepository(ApplicationFieldValue);
      if (params.formDefinitionId) {
        params.app.formDefinitionId = params.formDefinitionId;
        await valueRepo.delete({ applicationId: params.app.id });
      }
      if (params.approvalFlowId) {
        params.app.approvalFlowId = params.approvalFlowId;
      }
      if (params.status) {
        params.app.status = params.status;
      }
      if (params.formDefinitionId || params.approvalFlowId || params.status) {
        await appRepo.save(params.app);
      }
      if (params.values.length > 0) {
        await valueRepo.save(params.values);
      }
    });
  }

  async saveSubmittedApplication(app: Application): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      await em.getRepository(Application).save(app);
    });
  }

  async saveResubmittedApplication(params: {
    app: Application;
    openCorrection: CorrectionRequest;
  }): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      params.openCorrection.status = CorrectionRequestStatus.RESOLVED;
      params.openCorrection.resolvedAt = new Date();
      await corrRepo.save(params.openCorrection);

      for (const item of params.openCorrection.items ?? []) {
        item.isResolved = true;
        await itemRepo.save(item);
      }

      await appRepo.save(params.app);
    });
  }

  async saveApproval(params: {
    app: Application;
    approvalStepId: string;
    actorId: string;
    action: ApplicationApprovalActionValue;
    comment: string | null;
  }): Promise<void> {
    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const appRepo = em.getRepository(Application);
      await approvalRepo.save(
        approvalRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          approvalStepId: params.approvalStepId,
          actedByUserId: params.actorId,
          action: params.action,
          comment: params.comment,
        }),
      );
      await appRepo.save(params.app);
    });
  }

  async saveReturnForCorrection(params: {
    app: Application;
    approvalStepId: string;
    actorId: string;
    overallComment: string | null;
    fields: Array<{ fieldId: string; comment: string | null }>;
  }): Promise<void> {
    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      await approvalRepo.save(
        approvalRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          approvalStepId: params.approvalStepId,
          actedByUserId: params.actorId,
          action: ApplicationApprovalAction.RETURNED,
          comment: params.overallComment,
        }),
      );

      const correction = await corrRepo.save(
        corrRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          requestedByUserId: params.actorId,
          status: CorrectionRequestStatus.OPEN,
          overallComment: params.overallComment,
          resolvedAt: null,
        }),
      );

      for (const row of params.fields) {
        await itemRepo.save(
          itemRepo.create({
            tenantId: params.app.tenantId,
            correctionRequestId: correction.id,
            formFieldId: row.fieldId,
            comment: row.comment,
            isResolved: false,
          }),
        );
      }

      await appRepo.save(params.app);
    });
  }

  listCorrections(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest[]> {
    return this.correctionRequests.find({
      where: { applicationId, tenantId },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
  }

  async findLatestOpenCorrectionWithItems(
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

  findActiveApprovalFlow(params: {
    tenantId: string;
    groupId: string;
    approvalFlowId: string;
  }): Promise<ApprovalFlow | null> {
    return this.approvalFlows.findOne({
      where: {
        id: params.approvalFlowId,
        tenantId: params.tenantId,
        groupId: params.groupId,
        isActive: true,
      },
      relations: ['steps'],
    });
  }

  listActiveApprovalFlows(params: {
    tenantId: string;
    groupId: string;
    defaultOrder?: boolean;
  }): Promise<ApprovalFlow[]> {
    return this.approvalFlows.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        isActive: true,
      },
      relations: ['steps'],
      ...(params.defaultOrder
        ? { order: { createdAt: 'ASC', id: 'ASC' } }
        : {}),
    });
  }

  findApprovalsForProgress(params: {
    tenantId: string;
    applicationId: string;
  }): Promise<ApplicationApproval[]> {
    return this.approvals.find({
      where: {
        tenantId: params.tenantId,
        applicationId: params.applicationId,
      },
      relations: ['actedBy'],
      order: { actedAt: 'ASC' },
    });
  }

  findUsersByIdsInTenant(tenantId: string, ids: string[]): Promise<User[]> {
    return this.users.find({
      where: { tenantId, id: In(ids) },
    });
  }
}

function sortApprovalFlowSteps(row: Application | null): void {
  if (row?.approvalFlow?.steps?.length) {
    row.approvalFlow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
  }
}
