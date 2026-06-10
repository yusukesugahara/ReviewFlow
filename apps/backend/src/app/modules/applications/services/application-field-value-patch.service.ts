import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationCorrectionRepository } from '../../../../models/repositories/application-correction.repository';
import { ApplicationSubmissionRepository } from '../../../../models/repositories/application-submission.repository';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import type { PatchApplicationDto } from '../dto/applications.dto';
import { ApplicationPatchPolicy } from '../policies/application-patch.policy';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

type EditablePatchContext = {
  app: Application;
  fieldsByKey: Map<string, FormField>;
  allowedFieldIds?: Set<string>;
};

@Injectable()
export class ApplicationFieldValuePatchService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly patchPolicy: ApplicationPatchPolicy,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async applyPatch(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
  ): Promise<void> {
    this.patchPolicy.assertPatchTargetEditable(app, dto);
    const context = await this.loadEditablePatchContext(
      tenantId,
      app,
      dto.formDefinitionId,
    );
    const fieldValues = await this.buildFieldValuePatch(
      context,
      dto.values ?? {},
    );
    await this.saveApplicationPatch(app, dto, fieldValues);
  }

  private async loadEditablePatchContext(
    tenantId: string,
    app: Application,
    formDefinitionId?: string,
  ): Promise<EditablePatchContext> {
    this.patchPolicy.assertFormDefinitionChangeAllowed(app, formDefinitionId);
    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId,
        groupId: app.groupId,
        formDefinitionId: formDefinitionId ?? app.formDefinitionId,
        onlyPublished: !!formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    let allowedFieldIds: Set<string> | undefined;

    if (this.patchPolicy.requiresCorrectionFieldScope(app)) {
      const open = await this.findOpenCorrection(app.id);
      if (!open?.items?.length) {
        throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
      }
      allowedFieldIds = new Set(open.items.map((i) => i.formFieldId));
    } else {
      this.patchPolicy.assertFieldPatchAllowedWithoutCorrectionScope(app);
    }

    return { app, fieldsByKey, allowedFieldIds };
  }

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findOpenCorrection(applicationId);
  }

  private async buildFieldValuePatch(
    context: EditablePatchContext,
    values: Record<string, unknown>,
  ): Promise<ApplicationFieldValue[]> {
    this.formValueValidator.assertPatchValuesMatchFields(
      context.fieldsByKey,
      values,
      context.allowedFieldIds,
    );

    const existingValues =
      await this.submissionRepository.findExistingFieldValues(context.app.id);
    const existingByFieldId = new Map(
      existingValues.map((value) => [value.formFieldId, value]),
    );
    const patchedValues: ApplicationFieldValue[] = [];

    for (const [key, val] of Object.entries(values)) {
      const field = this.formValueValidator.getKnownField(
        context.fieldsByKey,
        key,
      );
      const existing = existingByFieldId.get(field.id);
      if (existing) {
        existing.valueJson = val;
        patchedValues.push(existing);
      } else {
        patchedValues.push(
          this.submissionRepository.createFieldValue({
            tenantId: context.app.tenantId,
            applicationId: context.app.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    }

    return patchedValues;
  }

  private async saveApplicationPatch(
    app: Application,
    dto: PatchApplicationDto,
    values: ApplicationFieldValue[],
  ): Promise<void> {
    if (
      !dto.formDefinitionId &&
      !dto.approvalFlowId &&
      !dto.status &&
      values.length === 0
    ) {
      return;
    }
    await this.submissionRepository.saveApplicationPatch({
      app,
      formDefinitionId: dto.formDefinitionId,
      approvalFlowId: dto.approvalFlowId,
      status: dto.status,
      values,
    });
  }
}
