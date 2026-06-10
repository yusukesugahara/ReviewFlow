import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApplicationApprovalAction,
  type ApplicationApprovalActionValue,
} from '../constants/application-approval-action';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ApplicationsRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
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

  findOpenCorrection(applicationId: string): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: { applicationId, status: CorrectionRequestStatus.OPEN },
      relations: ['items'],
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
