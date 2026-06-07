import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';

@Injectable()
export class ApplicationApprovalFlowResolver {
  constructor(
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
  ) {}

  async resolveActiveFlow(
    tenantId: string,
    groupId: string,
    approvalFlowId?: string,
  ): Promise<ApprovalFlow> {
    if (approvalFlowId) {
      const flow = await this.flows.findOne({
        where: {
          id: approvalFlowId,
          tenantId,
          groupId,
          isActive: true,
        },
        relations: ['steps'],
      });
      if (!flow) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
      }
      return flow;
    }

    const list = await this.flows.find({
      where: { tenantId, groupId, isActive: true },
      relations: ['steps'],
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
    const list = await this.flows.find({
      where: { tenantId, groupId, isActive: true },
      relations: ['steps'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    if (list.length === 0) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_APPROVAL_FLOW);
    }
    return list[0];
  }
}
