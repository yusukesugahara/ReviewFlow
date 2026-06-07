import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';

@Injectable()
export class ApplicationApprovalFlowResolver {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
  ) {}

  async resolveActiveFlow(
    tenantId: string,
    groupId: string,
    approvalFlowId?: string,
  ): Promise<ApprovalFlow> {
    if (approvalFlowId) {
      const flow = await this.applicationsRepository.findActiveApprovalFlow({
        tenantId,
        groupId,
        approvalFlowId,
      });
      if (!flow) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
      }
      return flow;
    }

    const list = await this.applicationsRepository.listActiveApprovalFlows({
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

  async resolveDefaultActiveFlow(
    tenantId: string,
    groupId: string,
  ): Promise<ApprovalFlow> {
    const list = await this.applicationsRepository.listActiveApprovalFlows({
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
