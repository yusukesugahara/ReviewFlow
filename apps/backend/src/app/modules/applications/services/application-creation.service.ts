import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { Application } from '../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import type { CreateApplicationDto } from '../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

@Injectable()
export class ApplicationCreationService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async create(
    tenantId: string,
    applicantEmail: string,
    applicantUserId: string | null,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const template = await this.resolvePublishedTemplate(tenantId, dto);
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const values = dto.values ?? {};
    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    this.formValueValidator.assertValuesMatchFields(fieldsByKey, values);

    const flow = await this.flowResolver.resolveActiveFlow(
      tenantId,
      dto.groupId,
      dto.approvalFlowId,
    );

    const newId = await this.applicationsRepository.createApplicationWithValues(
      {
        tenantId,
        groupId: dto.groupId,
        applicantUserId,
        applicantEmail,
        formDefinitionId: template.id,
        approvalFlowId: flow.id,
        status:
          dto.status === ApplicationStatus.PUBLISHED
            ? ApplicationStatus.PUBLISHED
            : ApplicationStatus.DRAFT,
        values: Object.entries(values).map(([key, val]) => {
          const field = this.formValueValidator.getKnownField(fieldsByKey, key);
          return {
            formFieldId: field.id,
            valueJson: val,
          };
        }),
      },
    );

    return this.loadCreatedApplication(tenantId, newId);
  }

  private async resolvePublishedTemplate(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<FormDefinition | null> {
    const result = await this.applicationsRepository.findPublishedTemplate({
      tenantId,
      groupId: dto.groupId,
      formDefinitionId: dto.formDefinitionId,
    });
    if (!Array.isArray(result)) {
      return result;
    }
    const templates = result;
    if (templates.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    return templates[0] ?? null;
  }

  private async loadCreatedApplication(
    tenantId: string,
    id: string,
  ): Promise<Application> {
    const created = await this.applicationsRepository.findCreatedApplication(
      tenantId,
      id,
    );
    if (!created) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return created;
  }
}
