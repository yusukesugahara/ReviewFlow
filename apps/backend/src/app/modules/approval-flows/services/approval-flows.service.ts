import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type {
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
} from '../dto/approval-flows.dto';
import { mapApprovalFlowToDto } from '../mappers/approval-flows.mapper';

@Injectable()
export class ApprovalFlowsService {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<ApprovalFlow[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.approvalFlowsRepository.listByGroup(actor.tenantId, groupId);
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
    const assignees = await this.approvalFlowsRepository.findAssignees(
      actor.tenantId,
      assigneeIds,
    );
    if (assignees.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }
    const assigneeMemberships =
      await this.approvalFlowsRepository.findAssigneeMemberships({
        tenantId: actor.tenantId,
        groupId: dto.groupId,
        assigneeIds,
      });
    if (assigneeMemberships.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }

    const newFlowId = await this.approvalFlowsRepository.createFlowWithSteps({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      name: dto.name.trim(),
      steps: sortedSteps.map((step) => ({
        stepOrder: step.stepOrder,
        stepName: step.stepName.trim(),
        assigneeUserIds: this.normalizeAssigneeUserIds(step),
        canReturn: step.canReturn,
      })),
    });

    return this.getOne(actor.tenantId, newFlowId);
  }

  async update(
    actor: AuthUserPayload,
    flowId: string,
    dto: UpdateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    const current = await this.getOne(actor.tenantId, flowId);
    await this.spaceAccess.assertCanManageGroup(actor, current.groupId);
    this.assertStepsValid({ groupId: current.groupId, ...dto });

    const sortedSteps = [...dto.steps].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    const assigneeIds = Array.from(
      new Set(
        sortedSteps.flatMap((step) => this.normalizeAssigneeUserIds(step)),
      ),
    );
    const assignees = await this.approvalFlowsRepository.findAssignees(
      actor.tenantId,
      assigneeIds,
    );
    if (assignees.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }
    const assigneeMemberships =
      await this.approvalFlowsRepository.findAssigneeMemberships({
        tenantId: actor.tenantId,
        groupId: current.groupId,
        assigneeIds,
      });
    if (assigneeMemberships.length !== assigneeIds.length) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }

    await this.approvalFlowsRepository.replaceFlowSteps({
      tenantId: actor.tenantId,
      flowId,
      name: dto.name.trim(),
      steps: sortedSteps.map((step) => ({
        stepOrder: step.stepOrder,
        stepName: step.stepName.trim(),
        assigneeUserIds: this.normalizeAssigneeUserIds(step),
        canReturn: step.canReturn,
      })),
    });

    return this.getOne(actor.tenantId, flowId);
  }

  async getOne(tenantId: string, flowId: string): Promise<ApprovalFlow> {
    const row = await this.approvalFlowsRepository.findOneById(
      tenantId,
      flowId,
    );
    if (!row) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
    }
    return row;
  }

  async listActiveForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<ApprovalFlow[]> {
    return this.approvalFlowsRepository.listActiveForApplicant({
      tenantId: actor.tenantId,
      groupId: actor.groupId,
    });
  }

  toDto(row: ApprovalFlow) {
    return mapApprovalFlowToDto(row);
  }
}
