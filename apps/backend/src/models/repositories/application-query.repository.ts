import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import { FormDefinition } from '../entities/form-definition.entity';

@Injectable()
export class ApplicationQueryRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
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
}

function sortApprovalFlowSteps(row: Application | null): void {
  if (row?.approvalFlow?.steps?.length) {
    row.approvalFlow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
  }
}
