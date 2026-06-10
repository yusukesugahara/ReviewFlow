import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import type { CreateApplicationDto } from '../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';

export type ApplicationCreationContext = {
  template: FormDefinition;
  flow: ApprovalFlow;
};

@Injectable()
export class ApplicationCreationContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
  ) {}

  async load(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<ApplicationCreationContext> {
    const [template, flow] = await Promise.all([
      this.resolvePublishedTemplate(tenantId, dto),
      this.flowResolver.resolveActiveFlow(
        tenantId,
        dto.groupId,
        dto.approvalFlowId,
      ),
    ]);

    return { template, flow };
  }

  private async resolvePublishedTemplate(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<FormDefinition> {
    const templates =
      await this.formDefinitionsRepository.findPublishedTemplatesForApplicationCreation(
        {
          tenantId,
          groupId: dto.groupId,
          formDefinitionId: dto.formDefinitionId,
        },
      );

    if (templates.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    const template = templates[0];
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return template;
  }
}
