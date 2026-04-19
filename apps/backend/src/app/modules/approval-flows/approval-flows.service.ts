import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../models/entities/approval-step.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import type { CreateApprovalFlowDto } from './approval-flows.dto';
import { mapApprovalFlowToDto } from './approval-flows.mapper';

@Injectable()
export class ApprovalFlowsService {
  constructor(
    @InjectRepository(ApprovalFlow)
    private readonly flows: Repository<ApprovalFlow>,
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
  ) {}

  async listByTenant(tenantId: string): Promise<ApprovalFlow[]> {
    const rows = await this.flows.find({
      where: { tenantId },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    for (const r of rows) {
      if (r.steps?.length) {
        r.steps.sort((a, b) => a.stepOrder - b.stepOrder);
      }
    }
    return rows;
  }

  private assertStepsValid(dto: CreateApprovalFlowDto): void {
    const orders = dto.steps.map((s) => s.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
    }
    const sorted = [...dto.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i]!.stepOrder !== i + 1) {
        throw clientError(ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID);
      }
    }
  }

  async create(
    tenantId: string,
    dto: CreateApprovalFlowDto,
  ): Promise<ApprovalFlow> {
    this.assertStepsValid(dto);

    const tpl = await this.templates.findOne({
      where: { id: dto.formTemplateId, tenantId },
    });
    if (!tpl) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    if (tpl.status !== FormTemplateStatus.PUBLISHED) {
      throw clientError(ClientErrorCodes.APPROVAL_FORM_TEMPLATE_NOT_PUBLISHED);
    }

    const sortedSteps = [...dto.steps].sort((a, b) => a.stepOrder - b.stepOrder);

    let newFlowId = '';
    await this.flows.manager.transaction(async (em) => {
      const flowRepo = em.getRepository(ApprovalFlow);
      const stepRepo = em.getRepository(ApprovalStep);
      const flow = flowRepo.create({
        tenantId,
        formTemplateId: dto.formTemplateId,
        name: dto.name.trim(),
        isActive: true,
      });
      const saved = await flowRepo.save(flow);
      newFlowId = saved.id;
      for (const s of sortedSteps) {
        await stepRepo.save(
          stepRepo.create({
            tenantId,
            approvalFlowId: saved.id,
            stepOrder: s.stepOrder,
            stepName: s.stepName.trim(),
            approverRole: s.approverRole,
            canReturn: s.canReturn,
          }),
        );
      }
    });

    return this.getOne(tenantId, newFlowId);
  }

  async getOne(tenantId: string, flowId: string): Promise<ApprovalFlow> {
    const row = await this.flows.findOne({
      where: { id: flowId, tenantId },
      relations: ['steps'],
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND);
    }
    if (row.steps?.length) {
      row.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    }
    return row;
  }

  toDto(row: ApprovalFlow) {
    return mapApprovalFlowToDto(row);
  }
}
