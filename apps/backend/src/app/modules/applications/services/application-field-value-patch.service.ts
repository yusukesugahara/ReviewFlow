import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import type { PatchApplicationDto } from '../dto/applications.dto';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

type EditablePatchContext = {
  app: Application;
  fieldsByKey: Map<string, FormField>;
  allowedFieldIds?: Set<string>;
};

@Injectable()
export class ApplicationFieldValuePatchService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async applyPatch(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
  ): Promise<void> {
    this.assertPatchTargetEditable(app, dto);
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

  private assertPatchTargetEditable(
    app: Application,
    dto: PatchApplicationDto,
  ): void {
    if (
      app.status === ApplicationStatus.RETURNED &&
      (dto.formDefinitionId || dto.approvalFlowId)
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  private async loadEditablePatchContext(
    tenantId: string,
    app: Application,
    formDefinitionId?: string,
  ): Promise<EditablePatchContext> {
    if (
      formDefinitionId &&
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.PUBLISHED
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    const template = await this.applicationsRepository.findTemplateByIdInGroup({
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

    if (app.status === ApplicationStatus.RETURNED) {
      const open = await this.findOpenCorrection(app.id);
      if (!open?.items?.length) {
        throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
      }
      allowedFieldIds = new Set(open.items.map((i) => i.formFieldId));
    } else if (
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.PUBLISHED
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    return { app, fieldsByKey, allowedFieldIds };
  }

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.applicationsRepository.findOpenCorrection(applicationId);
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
      await this.applicationsRepository.findExistingFieldValues(context.app.id);
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
          this.applicationsRepository.createFieldValue({
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
    if (!dto.formDefinitionId && !dto.approvalFlowId && values.length === 0) {
      return;
    }
    await this.applicationsRepository.saveApplicationPatch({
      app,
      formDefinitionId: dto.formDefinitionId,
      approvalFlowId: dto.approvalFlowId,
      values,
    });
  }
}
