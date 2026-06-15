import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import { SpaceAccessService } from '../../groups/services/access/space-access.service';
import type {
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
} from '../dto/approval-flows.dto';
import { mapApprovalFlowToDto } from '../mappers/approval-flows.mapper';
import { ApprovalFlowMutationService } from './approval-flow-mutation.service';

/**
 * 承認フロー API の query / mutation facade。
 */
@Injectable()
export class ApprovalFlowsService {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly approvalFlowMutation: ApprovalFlowMutationService,
  ) {}

  /**
   * space 管理者が承認フロー一覧を取得する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @returns 承認フロー一覧
   */
  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<ApprovalFlow[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.approvalFlowsRepository.listByGroup(actor.tenantId, groupId);
  }

  /**
   * 承認フローを作成する。
   * @param actor ログインユーザー
   * @param dto 承認フロー作成DTO
   * @returns 作成された承認フロー
   */
  async create(
    actor: AuthUserPayload,
    dto: CreateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    return this.approvalFlowMutation.create(actor, dto);
  }

  /**
   * 承認フローを更新する。
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
    return this.approvalFlowMutation.update(actor, flowId, dto);
  }

  /**
   * tenant scope 内の承認フローを取得する。
   * @param tenantId テナントID
   * @param flowId 承認フローID
   * @returns 承認フロー
   */
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

  /**
   * 申請者トークンの scope で利用できる有効な承認フロー一覧を取得する。
   * @param actor 申請者トークン
   * @returns 有効な承認フロー一覧
   */
  async listActiveForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<ApprovalFlow[]> {
    return this.approvalFlowsRepository.listActiveForApplicant({
      tenantId: actor.tenantId,
      groupId: actor.groupId,
    });
  }

  /**
   * 承認フローをレスポンスDTOへ変換する。
   * @param row 承認フロー
   * @returns 承認フローDTO
   */
  toDto(row: ApprovalFlow) {
    return mapApprovalFlowToDto(row);
  }
}
