import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import {
  ApprovalFlowsRepository,
  type CreateApprovalFlowStepParams,
} from '../../../../models/repositories/approval-flows.repository';
import { SpaceAccessService } from '../../groups/services/access/space-access.service';
import type {
  CreateApprovalFlowDto,
  CreateApprovalFlowStepDto,
  UpdateApprovalFlowDto,
} from '../dto/approval-flows.dto';

type ApprovalFlowStepInput = CreateApprovalFlowStepDto;

/**
 * 承認フローの作成・更新とステップ検証を扱う service。
 */
@Injectable()
export class ApprovalFlowMutationService {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  /**
   * space 管理権限と承認者所属を検証し、承認フローを作成する。
   * @param actor ログインユーザー
   * @param dto 承認フロー作成DTO
   * @returns 作成された承認フロー
   */
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

  /**
   * 既存承認フローの管理権限と承認者所属を検証し、ステップを置き換える。
   * @param actor ログインユーザー
   * @param flowId 承認フローID
   * @param dto 承認フロー更新DTO
   * @returns 更新された承認フロー
   */
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

  /**
   * stepOrder と担当者を検証し、repository 用ステップに変換する。
   * @param steps 承認ステップ入力
   * @returns 作成用承認ステップ
   */
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

  /**
   * stepOrder が重複なく 1 から連番になっているか検証する。
   * @param steps 承認ステップ入力
   */
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

  /**
   * 単数・複数担当者入力を正規化して重複を除いたユーザーID一覧を返す。
   * @param step 承認ステップ入力
   * @returns 担当者ユーザーID一覧
   */
  private normalizeAssigneeUserIds(step: ApprovalFlowStepInput): string[] {
    const ids =
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : [step.assigneeUserId ?? ''];
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  }

  /**
   * 全ステップの担当者ユーザーIDを重複なく収集する。
   * @param steps 作成用承認ステップ
   * @returns 担当者ユーザーID一覧
   */
  private collectAssigneeIds(steps: CreateApprovalFlowStepParams[]): string[] {
    return Array.from(new Set(steps.flatMap((step) => step.assigneeUserIds)));
  }

  /**
   * 承認者が同一 tenant に存在し、対象 space のメンバーであることを検証する。
   * @param params 検証パラメータ
   */
  private async assertAssigneesCanApprove(params: {
    tenantId: string;
    groupId: string;
    assigneeIds: string[];
  }): Promise<void> {
    const assigneeCount =
      await this.approvalFlowsRepository.countAssigneesInTenant(
        params.tenantId,
        params.assigneeIds,
      );
    if (assigneeCount !== params.assigneeIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }
    const assigneeMembershipCount =
      await this.approvalFlowsRepository.countAssigneeMemberships(params);
    if (assigneeMembershipCount !== params.assigneeIds.length) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }
  }

  /**
   * tenant scope 内の承認フローを読み込む。
   * @param tenantId テナントID
   * @param flowId 承認フローID
   * @returns 承認フロー
   */
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
