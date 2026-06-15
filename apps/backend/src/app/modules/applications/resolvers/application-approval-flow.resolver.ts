import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';

@Injectable()
export class ApplicationApprovalFlowResolver {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
  ) {}

  /**
   * 有効な承認フローを解決する
   * @param tenantId テナントID
   * @param groupId グループID
   * @param approvalFlowId 承認フローID (省略可)
   * @returns 承認フロー
   */
  async resolveActiveFlow(
    tenantId: string,
    groupId: string,
    approvalFlowId?: string,
  ): Promise<ApprovalFlow> {
    if (approvalFlowId) {
      const flow = await this.approvalFlowsRepository.findActiveApprovalFlow({
        tenantId,
        groupId,
        approvalFlowId,
      });
      if (!flow) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
      }
      return flow;
    }

    const list = await this.approvalFlowsRepository.listActiveApprovalFlows({
      tenantId,
      groupId,
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    if (list.length > 1) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FLOW_AMBIGUOUS);
    }
    return list[0];
  }

  /**
   * 作成順の最初の有効な承認フローを解決する
   * @param tenantId テナントID
   * @param groupId グループID
   * @returns 承認フロー
   */
  async resolveDefaultActiveFlow(
    tenantId: string,
    groupId: string,
  ): Promise<ApprovalFlow> {
    const list = await this.approvalFlowsRepository.listActiveApprovalFlows({
      tenantId,
      groupId,
      defaultOrder: true,
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    return list[0];
  }
}
