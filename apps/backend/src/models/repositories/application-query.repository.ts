import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  Repository,
  SelectQueryBuilder,
  type FindOptionsWhere,
} from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import { ApprovalStep } from '../entities/approval-step.entity';

@Injectable()
export class ApplicationQueryRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
  ) {}

  countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.approvals.count({
      where: { applicationId, actedByUserId: actorId },
    });
  }

  async findById(
    params: {
      tenantId: string;
      id: string;
      detail: boolean;
    },
    manager?: EntityManager,
  ): Promise<Application | null> {
    const row = await this.findOneApplication(
      { id: params.id, tenantId: params.tenantId },
      this.findByIdRelations(params.detail),
      manager,
    );
    return prepareApplicationRow(row);
  }

  async listForTenantAdmin(
    tenantId: string,
    groupId: string,
  ): Promise<Application[]> {
    const rows = await this.createListQuery(tenantId, groupId).getMany();
    return prepareApplicationRows(rows);
  }

  async listForGroup(
    tenantId: string,
    groupId: string,
  ): Promise<Application[]> {
    const rows = await this.createListQuery(tenantId, groupId).getMany();
    return prepareApplicationRows(rows);
  }

  findApplicantEditable(
    params: {
      tenantId: string;
      id: string;
      applicantUserId?: string;
      applicantEmail: string;
    },
    manager?: EntityManager,
  ): Promise<Application | null> {
    return this.findOneApplication(
      this.applicantEditableWhere(params),
      ['fieldValues'],
      manager,
    );
  }

  /**
   * manager が渡された場合は、更新系 use case からの取得として扱い、
   * 対象 application 行を悲観ロックしてから relation を読み込む。
   * manager がない通常参照ではロックしない。
   */
  private async findOneApplication(
    where: FindOptionsWhere<Application>,
    relations: string[],
    manager?: EntityManager,
  ): Promise<Application | null> {
    const repo = this.applicationRepository(manager);
    if (
      manager &&
      !(await repo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      }))
    ) {
      return null;
    }

    return repo.findOne({
      where,
      relations,
    });
  }

  private createListQuery(
    tenantId: string,
    groupId: string,
  ): SelectQueryBuilder<Application> {
    return this.apps
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.formDefinition', 'formDefinition')
      .leftJoinAndMapOne(
        'app.currentApprovalStep',
        ApprovalStep,
        'currentStep',
        [
          'currentStep.tenantId = app.tenantId',
          'currentStep.groupId = app.groupId',
          'currentStep.approvalFlowId = app.approvalFlowId',
          'currentStep.stepOrder = app.currentStepOrder',
        ].join(' AND '),
      )
      .where('app.tenantId = :tenantId', { tenantId })
      .andWhere('app.groupId = :groupId', { groupId })
      .orderBy('app.createdAt', 'DESC');
  }

  private findByIdRelations(detail: boolean): string[] {
    return detail
      ? [
          'fieldValues',
          'fieldValues.formField',
          'formDefinition',
          'approvalFlow',
          'approvalFlow.steps',
        ]
      : ['formDefinition', 'approvalFlow', 'approvalFlow.steps'];
  }

  private applicantEditableWhere(params: {
    tenantId: string;
    id: string;
    applicantUserId?: string;
    applicantEmail: string;
  }): FindOptionsWhere<Application> {
    return {
      id: params.id,
      tenantId: params.tenantId,
      ...(params.applicantUserId
        ? { applicantUserId: params.applicantUserId }
        : { applicantEmail: params.applicantEmail }),
    };
  }

  private applicationRepository(
    manager?: EntityManager,
  ): Repository<Application> {
    return manager?.getRepository(Application) ?? this.apps;
  }
}

function prepareApplicationRows(rows: Application[]): Application[] {
  rows.forEach(prepareApplicationRow);
  return rows;
}

function prepareApplicationRow<T extends Application | null>(row: T): T {
  if (!row) {
    return row;
  }
  sortApprovalFlowSteps(row);
  resolveCurrentApprovalStep(row);
  return row;
}

function sortApprovalFlowSteps(row: Application): void {
  if (row?.approvalFlow?.steps?.length) {
    row.approvalFlow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
  }
}

function resolveCurrentApprovalStep(row: Application): void {
  if (row.currentStepOrder == null) {
    row.currentApprovalStep = null;
    return;
  }
  if (row.currentApprovalStep !== undefined) {
    return;
  }
  row.currentApprovalStep =
    row.approvalFlow?.steps?.find(
      (step) => step.stepOrder === row.currentStepOrder,
    ) ?? null;
}
