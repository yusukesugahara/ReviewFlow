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

@Injectable()
export class ApprovalFlowsService {
  constructor(
    private readonly approvalFlowsRepository: ApprovalFlowsRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly approvalFlowMutation: ApprovalFlowMutationService,
  ) {}

  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<ApprovalFlow[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.approvalFlowsRepository.listByGroup(actor.tenantId, groupId);
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    return this.approvalFlowMutation.create(actor, dto);
  }

  async update(
    actor: AuthUserPayload,
    flowId: string,
    dto: UpdateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    return this.approvalFlowMutation.update(actor, flowId, dto);
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
