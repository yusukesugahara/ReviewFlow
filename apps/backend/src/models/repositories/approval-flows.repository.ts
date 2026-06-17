import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { ApprovalStep } from '../entities/approval-step.entity';
import { GroupMember } from '../entities/group-member.entity';
import { User } from '../entities/user.entity';

export type CreateApprovalFlowStepParams = {
  stepOrder: number;
  stepName: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

@Injectable()
export class ApprovalFlowsRepository {
  constructor(
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async listByGroup(
    tenantId: string,
    groupId: string,
  ): Promise<ApprovalFlow[]> {
    const rows = await this.flows.find({
      where: { tenantId, groupId },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    return sortFlowSteps(rows);
  }

  countAssigneesInTenant(
    tenantId: string,
    assigneeIds: string[],
  ): Promise<number> {
    if (assigneeIds.length === 0) {
      return Promise.resolve(0);
    }

    return this.users.count({
      where: { tenantId, id: In(assigneeIds) },
    });
  }

  countAssigneeMemberships(params: {
    tenantId: string;
    groupId: string;
    assigneeIds: string[];
  }): Promise<number> {
    if (params.assigneeIds.length === 0) {
      return Promise.resolve(0);
    }

    return this.members.count({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        userId: In(params.assigneeIds),
      },
    });
  }

  async createFlowWithSteps(params: {
    tenantId: string;
    groupId: string;
    name: string;
    steps: CreateApprovalFlowStepParams[];
  }): Promise<string> {
    let newFlowId = '';
    await this.flows.manager.transaction(async (em) => {
      const flowRepo = em.getRepository(ApprovalFlow);
      const stepRepo = em.getRepository(ApprovalStep);
      const flow = flowRepo.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        name: params.name,
        isActive: true,
      });
      const saved = await flowRepo.save(flow);
      newFlowId = saved.id;

      for (const step of params.steps) {
        await stepRepo.save(
          stepRepo.create({
            tenantId: params.tenantId,
            groupId: params.groupId,
            approvalFlowId: saved.id,
            stepOrder: step.stepOrder,
            stepName: step.stepName,
            assigneeUserId: step.assigneeUserIds[0],
            assigneeUserIds: step.assigneeUserIds,
            canReturn: step.canReturn,
          }),
        );
      }
    });
    return newFlowId;
  }

  async replaceFlowSteps(params: {
    tenantId: string;
    flowId: string;
    name: string;
    steps: CreateApprovalFlowStepParams[];
  }): Promise<void> {
    await this.flows.manager.transaction(async (em) => {
      const flowRepo = em.getRepository(ApprovalFlow);
      const stepRepo = em.getRepository(ApprovalStep);
      const flow = await flowRepo.findOne({
        where: { id: params.flowId, tenantId: params.tenantId },
      });
      if (!flow) {
        return;
      }
      flow.name = params.name;
      await flowRepo.save(flow);
      await stepRepo.delete({
        tenantId: params.tenantId,
        approvalFlowId: params.flowId,
      });
      for (const step of params.steps) {
        await stepRepo.save(
          stepRepo.create({
            tenantId: params.tenantId,
            groupId: flow.groupId,
            approvalFlowId: params.flowId,
            stepOrder: step.stepOrder,
            stepName: step.stepName,
            assigneeUserId: step.assigneeUserIds[0],
            assigneeUserIds: step.assigneeUserIds,
            canReturn: step.canReturn,
          }),
        );
      }
    });
  }

  async findOneByIdInTenant(
    tenantId: string,
    flowId: string,
  ): Promise<ApprovalFlow | null> {
    const row = await this.flows.findOne({
      where: { id: flowId, tenantId },
      relations: ['steps'],
    });
    return row ? sortFlowSteps([row])[0] : null;
  }

  async findActiveApprovalFlow(params: {
    tenantId: string;
    groupId: string;
    approvalFlowId: string;
  }): Promise<ApprovalFlow | null> {
    const row = await this.flows.findOne({
      where: {
        id: params.approvalFlowId,
        tenantId: params.tenantId,
        groupId: params.groupId,
        isActive: true,
      },
      relations: ['steps'],
    });
    return row ? sortFlowSteps([row])[0] : null;
  }

  async listActiveApprovalFlows(params: {
    tenantId: string;
    groupId: string;
    defaultOrder?: boolean;
  }): Promise<ApprovalFlow[]> {
    const rows = await this.flows.find({
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
    return sortFlowSteps(rows);
  }

  async listActiveForApplicant(params: {
    tenantId: string;
    groupId: string;
  }): Promise<ApprovalFlow[]> {
    const rows = await this.flows.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        isActive: true,
      },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    return sortFlowSteps(rows);
  }
}

function sortFlowSteps(rows: ApprovalFlow[]): ApprovalFlow[] {
  for (const row of rows) {
    if (row.steps?.length) {
      row.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    }
  }
  return rows;
}
