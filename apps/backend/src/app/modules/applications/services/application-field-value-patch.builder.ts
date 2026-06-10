import { Injectable } from '@nestjs/common';
import { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { ApplicationSubmissionRepository } from '../../../../models/repositories/application-submission.repository';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
import type { ApplicationPatchContext } from './application-patch-context.loader';

@Injectable()
export class ApplicationFieldValuePatchBuilder {
  constructor(
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async build(
    context: ApplicationPatchContext,
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
}
