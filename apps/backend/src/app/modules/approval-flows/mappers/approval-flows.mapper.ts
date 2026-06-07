import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import type {
  ApprovalFlowResponseDto,
  ApprovalStepResponseDto,
} from '../dto/approval-flows.dto';

export function mapApprovalStepToDto(
  row: ApprovalStep,
): ApprovalStepResponseDto {
  return {
    id: row.id,
    stepOrder: row.stepOrder,
    stepName: row.stepName,
    assigneeUserId: row.assigneeUserId,
    assigneeUserIds:
      row.assigneeUserIds && row.assigneeUserIds.length > 0
        ? row.assigneeUserIds
        : [row.assigneeUserId],
    canReturn: row.canReturn,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapApprovalFlowToDto(
  row: ApprovalFlow,
): ApprovalFlowResponseDto {
  const steps = [...(row.steps ?? [])].sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    isActive: row.isActive,
    steps: steps.map(mapApprovalStepToDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
