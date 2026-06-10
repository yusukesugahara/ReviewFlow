import { Injectable } from '@nestjs/common';
import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import { ApplicationApproval } from '../../../../models/entities/application-approval.entity';
import { Application } from '../../../../models/entities/application.entity';
import { ApplicationProgressRepository } from '../../../../models/repositories/application-progress.repository';
import type { ApplicationProgressStepDto } from '../dto/applications.dto';
import type { ApplicationWithProgress } from '../mappers/applications.mapper';

@Injectable()
export class ApplicationProgressService {
  constructor(
    private readonly progressRepository: ApplicationProgressRepository,
  ) {}

  async hydrate(row: Application): Promise<ApplicationWithProgress> {
    const steps = [...(row.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    if (steps.length === 0) {
      return Object.assign(row, { approvalProgress: [] });
    }

    const approvals = await this.progressRepository.findApprovalsForProgress({
      tenantId: row.tenantId,
      applicationId: row.id,
    });
    const userIds = new Set<string>();
    for (const step of steps) {
      const assigneeIds =
        step.assigneeUserIds && step.assigneeUserIds.length > 0
          ? step.assigneeUserIds
          : [step.assigneeUserId];
      for (const id of assigneeIds) {
        userIds.add(id);
      }
    }
    for (const approval of approvals) {
      userIds.add(approval.actedByUserId);
    }
    const users = await this.progressRepository.findUsersByIdsInTenant(
      row.tenantId,
      [...userIds],
    );
    const userById = new Map(users.map((user) => [user.id, user]));
    const approvalsByStepId = new Map<string, ApplicationApproval[]>();
    for (const approval of approvals) {
      const list = approvalsByStepId.get(approval.approvalStepId) ?? [];
      list.push(approval);
      approvalsByStepId.set(approval.approvalStepId, list);
    }

    const approvalProgress: ApplicationProgressStepDto[] = steps.map((step) => {
      const stepApprovals = approvalsByStepId.get(step.id) ?? [];
      const latestAction = stepApprovals.at(-1)?.action;
      const assigneeIds =
        step.assigneeUserIds && step.assigneeUserIds.length > 0
          ? step.assigneeUserIds
          : [step.assigneeUserId];
      const status: ApplicationProgressStepDto['status'] =
        latestAction === ApplicationApprovalAction.RETURNED
          ? 'returned'
          : latestAction === ApplicationApprovalAction.REJECTED
            ? 'rejected'
            : latestAction === ApplicationApprovalAction.APPROVED
              ? 'approved'
              : row.currentStepOrder === step.stepOrder
                ? 'current'
                : 'pending';

      return {
        id: step.id,
        stepOrder: step.stepOrder,
        stepName: step.stepName,
        canReturn: step.canReturn,
        status,
        assignees: assigneeIds.map((id) => {
          const user = userById.get(id);
          return {
            id,
            email: user?.email ?? id,
            name: user?.name ?? null,
          };
        }),
        actions: stepApprovals.map((approval) => {
          const user = approval.actedBy ?? userById.get(approval.actedByUserId);
          return {
            id: approval.id,
            action: approval.action,
            comment: approval.comment,
            actedAt: approval.actedAt.toISOString(),
            actedBy: {
              id: approval.actedByUserId,
              email: user?.email ?? approval.actedByUserId,
              name: user?.name ?? null,
            },
          };
        }),
      };
    });

    return Object.assign(row, { approvalProgress });
  }
}
