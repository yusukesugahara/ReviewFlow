import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  findAssignees(tenantId: string, assigneeIds: string[]): Promise<User[]> {
    return this.users.find({
      where: assigneeIds.map((id) => ({ id, tenantId })),
    });
  }

  findAssigneeMemberships(params: {
    tenantId: string;
    groupId: string;
    assigneeIds: string[];
  }): Promise<GroupMember[]> {
    return this.members.find({
      where: params.assigneeIds.map((userId) => ({
        tenantId: params.tenantId,
        groupId: params.groupId,
        userId,
      })),
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

  async findOneById(
    tenantId: string,
    flowId: string,
  ): Promise<ApprovalFlow | null> {
    const row = await this.flows.findOne({
      where: { id: flowId, tenantId },
      relations: ['steps'],
    });
    return row ? sortFlowSteps([row])[0] : null;
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
