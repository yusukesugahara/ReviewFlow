import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import { GroupMember } from '../../../../models/entities/group-member.entity';
import { User } from '../../../../models/entities/user.entity';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CreateApprovalFlowDto } from '../dto/approval-flows.dto';
import { mapApprovalFlowToDto } from '../mappers/approval-flows.mapper';

@Injectable()
export class ApprovalFlowsService {
  constructor(
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<ApprovalFlow[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    const rows = await this.flows.find({
      where: { tenantId: actor.tenantId, groupId },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    for (const r of rows) {
      if (r.steps?.length) {
        r.steps.sort((a, b) => a.stepOrder - b.stepOrder);
      }
    }
    return rows;
  }

  private assertStepsValid(dto: CreateApprovalFlowDto): void {
    const orders = dto.steps.map((s) => s.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
    }
    const sorted = [...dto.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    for (const [index, step] of sorted.entries()) {
      if (step.stepOrder !== index + 1) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
      }
    }
    for (const step of dto.steps) {
      const assigneeUserIds = this.normalizeAssigneeUserIds(step);
      if (assigneeUserIds.length === 0) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
      }
    }
  }

  private normalizeAssigneeUserIds(
    step: CreateApprovalFlowDto['steps'][number],
  ): string[] {
    const ids =
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : [step.assigneeUserId ?? ''];
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    await this.spaceAccess.assertCanManageGroup(actor, dto.groupId);
    this.assertStepsValid(dto);

    const sortedSteps = [...dto.steps].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    const assigneeIds = Array.from(
      new Set(
        sortedSteps.flatMap((step) => this.normalizeAssigneeUserIds(step)),
      ),
    );
    const assignees = await this.users.find({
      where: assigneeIds.map((id) => ({ id, tenantId: actor.tenantId })),
    });
    if (assignees.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }
    const assigneeMemberships = await this.members.find({
      where: assigneeIds.map((userId) => ({
        tenantId: actor.tenantId,
        groupId: dto.groupId,
        userId,
      })),
    });
    if (assigneeMemberships.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }

    let newFlowId = '';
    await this.flows.manager.transaction(async (em) => {
      const flowRepo = em.getRepository(ApprovalFlow);
      const stepRepo = em.getRepository(ApprovalStep);
      const flow = flowRepo.create({
        tenantId: actor.tenantId,
        groupId: dto.groupId,
        name: dto.name.trim(),
        isActive: true,
      });
      const saved = await flowRepo.save(flow);
      newFlowId = saved.id;
      for (const s of sortedSteps) {
        const assigneeUserIds = this.normalizeAssigneeUserIds(s);
        await stepRepo.save(
          stepRepo.create({
            tenantId: actor.tenantId,
            groupId: dto.groupId,
            approvalFlowId: saved.id,
            stepOrder: s.stepOrder,
            stepName: s.stepName.trim(),
            assigneeUserId: assigneeUserIds[0],
            assigneeUserIds,
            canReturn: s.canReturn,
          }),
        );
      }
    });

    return this.getOne(actor.tenantId, newFlowId);
  }

  async getOne(tenantId: string, flowId: string): Promise<ApprovalFlow> {
    const row = await this.flows.findOne({
      where: { id: flowId, tenantId },
      relations: ['steps'],
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
    }
    if (row.steps?.length) {
      row.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    }
    return row;
  }

  async listActiveForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<ApprovalFlow[]> {
    const rows = await this.flows.find({
      where: {
        tenantId: actor.tenantId,
        groupId: actor.groupId,
        isActive: true,
      },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    for (const row of rows) {
      if (row.steps?.length) {
        row.steps.sort((a, b) => a.stepOrder - b.stepOrder);
      }
    }
    return rows;
  }

  toDto(row: ApprovalFlow) {
    return mapApprovalFlowToDto(row);
  }
}
