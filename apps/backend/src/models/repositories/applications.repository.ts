import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { FormDefinition } from '../entities/form-definition.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ApplicationsRepository {
  constructor(
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    @InjectRepository(ApprovalFlow)
    private readonly approvalFlows: Repository<ApprovalFlow>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

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
