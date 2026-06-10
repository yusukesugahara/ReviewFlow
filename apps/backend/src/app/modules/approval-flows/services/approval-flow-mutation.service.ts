import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import {
  ApprovalFlowsRepository,
  type CreateApprovalFlowStepParams,
} from '../../../../models/repositories/approval-flows.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type {
  CreateApprovalFlowDto,
  CreateApprovalFlowStepDto,
  UpdateApprovalFlowDto,
} from '../dto/approval-flows.dto';

type ApprovalFlowStepInput = CreateApprovalFlowStepDto;

@Injectable()
export class ApprovalFlowMutationService {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  async create(
    actor: AuthUserPayload,
    dto: CreateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    await this.spaceAccess.assertCanManageGroup(actor, dto.groupId);
    const steps = this.buildValidatedSteps(dto.steps);
    const assigneeIds = this.collectAssigneeIds(steps);
    await this.assertAssigneesCanApprove({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      assigneeIds,
    });

    const newFlowId = await this.approvalFlowsRepository.createFlowWithSteps({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      name: dto.name.trim(),
      steps,
    });

    return this.findFlowOrThrow(actor.tenantId, newFlowId);
  }

  async update(
    actor: AuthUserPayload,
    flowId: string,
    dto: UpdateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    const current = await this.findFlowOrThrow(actor.tenantId, flowId);
    await this.spaceAccess.assertCanManageGroup(actor, current.groupId);
    const steps = this.buildValidatedSteps(dto.steps);
    const assigneeIds = this.collectAssigneeIds(steps);
    await this.assertAssigneesCanApprove({
      tenantId: actor.tenantId,
      groupId: current.groupId,
      assigneeIds,
    });

    await this.approvalFlowsRepository.replaceFlowSteps({
      tenantId: actor.tenantId,
      flowId,
      name: dto.name.trim(),
      steps,
    });

    return this.findFlowOrThrow(actor.tenantId, flowId);
  }

  private buildValidatedSteps(
    steps: ApprovalFlowStepInput[],
  ): CreateApprovalFlowStepParams[] {
    this.assertStepOrdersValid(steps);
    return [...steps]
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((step) => {
        const assigneeUserIds = this.normalizeAssigneeUserIds(step);
        if (assigneeUserIds.length === 0) {
          throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
        }
        return {
          stepOrder: step.stepOrder,
          stepName: step.stepName.trim(),
          assigneeUserIds,
          canReturn: step.canReturn,
        };
      });
  }

  private assertStepOrdersValid(steps: ApprovalFlowStepInput[]): void {
    const orders = steps.map((step) => step.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
    }
    const sorted = [...orders].sort((a, b) => a - b);
    for (const [index, order] of sorted.entries()) {
      if (order !== index + 1) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
      }
    }
  }

  private normalizeAssigneeUserIds(step: ApprovalFlowStepInput): string[] {
    const ids =
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : [step.assigneeUserId ?? ''];
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  }

  private collectAssigneeIds(steps: CreateApprovalFlowStepParams[]): string[] {
    return Array.from(new Set(steps.flatMap((step) => step.assigneeUserIds)));
  }

  private async assertAssigneesCanApprove(params: {
    tenantId: string;
    groupId: string;
    assigneeIds: string[];
  }): Promise<void> {
    const assignees = await this.approvalFlowsRepository.findAssignees(
      params.tenantId,
      params.assigneeIds,
    );
    if (assignees.length !== params.assigneeIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }
    const assigneeMemberships =
      await this.approvalFlowsRepository.findAssigneeMemberships(params);
    if (assigneeMemberships.length !== params.assigneeIds.length) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }
  }

  private async findFlowOrThrow(
    tenantId: string,
    flowId: string,
  ): Promise<ApprovalFlow> {
    const row = await this.approvalFlowsRepository.findOneById(
      tenantId,
      flowId,
    );
    if (!row) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
    }
    return row;
  }
}
