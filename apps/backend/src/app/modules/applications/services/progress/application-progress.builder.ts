import { Injectable } from '@nestjs/common';
import { ApplicationApprovalAction } from '../../../../../models/constants/application-approval-action';
import type { ApplicationApproval } from '../../../../../models/entities/application-approval.entity';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../../models/entities/approval-step.entity';
import type { User } from '../../../../../models/entities/user.entity';
import type { ApplicationProgressStepDto } from '../../dto/applications.dto';

/**
 * 承認フロー・承認履歴・ユーザー情報から申請進捗DTOを組み立てる builder。
 */
@Injectable()
export class ApplicationProgressBuilder {
  /**
   * 承認ステップを stepOrder 順に並べて返す。
   * @param row 申請
   * @returns 承認ステップ
   */
  getOrderedSteps(row: Application): ApprovalStep[] {
    return [...(row.approvalFlow?.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
  }

  /**
   * 進捗表示に必要な担当者・操作ユーザーIDを収集する。
   * @param row 申請
   * @param approvals 承認履歴
   * @returns ユーザーID一覧
   */
  collectUserIds(row: Application, approvals: ApplicationApproval[]): string[] {
    const userIds = new Set<string>();

    for (const step of this.getOrderedSteps(row)) {
      for (const id of this.getAssigneeIds(step)) {
        userIds.add(id);
      }
    }
    for (const approval of approvals) {
      userIds.add(approval.actedByUserId);
    }

    return [...userIds];
  }

  /**
   * 申請進捗ステップDTOを組み立てる。
   * @param row 申請
   * @param approvals 承認履歴
   * @param users 進捗表示に必要なユーザー
   * @returns 申請進捗ステップDTO
   */
  build(
    row: Application,
    approvals: ApplicationApproval[],
    users: User[],
  ): ApplicationProgressStepDto[] {
    const userById = new Map(users.map((user) => [user.id, user]));
    const approvalsByStepId = this.groupApprovalsByStepId(approvals);

    return this.getOrderedSteps(row).map((step) => {
      const stepApprovals = approvalsByStepId.get(step.id) ?? [];
      const assigneeIds = this.getAssigneeIds(step);

      return {
        id: step.id,
        stepOrder: step.stepOrder,
        stepName: step.stepName,
        canReturn: step.canReturn,
        status: this.getStepStatus(row, step, stepApprovals),
        assignees: assigneeIds.map((id) => this.mapProgressUser(id, userById)),
        actions: stepApprovals.map((approval) =>
          this.mapProgressAction(approval, userById),
        ),
      };
    });
  }

  /**
   * 承認履歴を承認ステップIDごとにまとめる。
   * @param approvals 承認履歴
   * @returns 承認ステップIDごとの承認履歴
   */
  private groupApprovalsByStepId(
    approvals: ApplicationApproval[],
  ): Map<string, ApplicationApproval[]> {
    const approvalsByStepId = new Map<string, ApplicationApproval[]>();
    for (const approval of approvals) {
      const list = approvalsByStepId.get(approval.approvalStepId) ?? [];
      list.push(approval);
      approvalsByStepId.set(approval.approvalStepId, list);
    }
    return approvalsByStepId;
  }

  /**
   * 承認履歴と現在ステップから進捗ステータスを決定する。
   * @param row 申請
   * @param step 承認ステップ
   * @param stepApprovals ステップの承認履歴
   * @returns 進捗ステータス
   */
  private getStepStatus(
    row: Application,
    step: ApprovalStep,
    stepApprovals: ApplicationApproval[],
  ): ApplicationProgressStepDto['status'] {
    const latestAction = stepApprovals.at(-1)?.action;
    if (latestAction === ApplicationApprovalAction.RETURNED) {
      return 'returned';
    }
    if (latestAction === ApplicationApprovalAction.REJECTED) {
      return 'rejected';
    }
    if (latestAction === ApplicationApprovalAction.APPROVED) {
      return 'approved';
    }
    return row.currentStepOrder === step.stepOrder ? 'current' : 'pending';
  }

  /**
   * 単数・複数担当者の互換データから担当者ID一覧を返す。
   * @param step 承認ステップ
   * @returns 担当者ID一覧
   */
  private getAssigneeIds(step: ApprovalStep): string[] {
    return step.assigneeUserIds && step.assigneeUserIds.length > 0
      ? step.assigneeUserIds
      : [step.assigneeUserId];
  }

  /**
   * 進捗表示用ユーザーDTOへ変換する。
   * @param id ユーザーID
   * @param userById ユーザー辞書
   * @returns 進捗表示用ユーザーDTO
   */
  private mapProgressUser(
    id: string,
    userById: Map<string, User>,
  ): ApplicationProgressStepDto['assignees'][number] {
    const user = userById.get(id);
    return {
      id,
      email: user?.email ?? id,
      name: user?.name ?? null,
    };
  }

  /**
   * 承認履歴を進捗表示用アクションDTOへ変換する。
   * @param approval 承認履歴
   * @param userById ユーザー辞書
   * @returns 進捗表示用アクションDTO
   */
  private mapProgressAction(
    approval: ApplicationApproval,
    userById: Map<string, User>,
  ): ApplicationProgressStepDto['actions'][number] {
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
  }
}
