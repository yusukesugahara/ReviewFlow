import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../../models/entities/approval-step.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { ReturnApplicationDto } from '../../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';

export type ReturnForCorrectionContext = {
  currentStep: ApprovalStep;
  template: FormDefinition;
};

@Injectable()
export class ApplicationReturnForCorrectionContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async load(
    app: Application,
    dto: ReturnApplicationDto,
  ): Promise<ReturnForCorrectionContext> {
    const currentStep = this.transitionPolicy.getCurrentStep(app);
    this.transitionPolicy.assertStepCanReturn(currentStep);
    await this.assertNoOpenCorrection(app.id);

    const template = await this.loadTemplate(app);
    this.assertReturnFieldsBelongToTemplate(template, dto);

    return { currentStep, template };
  }

  private async assertNoOpenCorrection(applicationId: string): Promise<void> {
    const existingOpen =
      await this.correctionRepository.findOpenCorrection(applicationId);
    if (existingOpen) {
      throw clientError(ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN);
    }
  }

  private async loadTemplate(app: Application): Promise<FormDefinition> {
    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId: app.tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return template;
  }

  private assertReturnFieldsBelongToTemplate(
    template: FormDefinition,
    dto: ReturnApplicationDto,
  ): void {
    const fieldIdsOnTemplate = new Set(
      (template.fields ?? []).map((field) => field.id),
    );

    for (const field of dto.fields) {
      if (!fieldIdsOnTemplate.has(field.fieldId)) {
        throw clientError(ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID);
      }
    }
  }
}
