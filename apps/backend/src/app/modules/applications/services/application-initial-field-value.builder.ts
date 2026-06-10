import { Injectable } from '@nestjs/common';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { CreateApplicationValue } from '../../../../models/repositories/application-creation.repository';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

@Injectable()
export class ApplicationInitialFieldValueBuilder {
  constructor(
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  build(
    template: FormDefinition,
    values: Record<string, unknown>,
  ): CreateApplicationValue[] {
    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    this.formValueValidator.assertValuesMatchFields(fieldsByKey, values);

    return Object.entries(values).map(([key, val]) => {
      const field = this.formValueValidator.getKnownField(fieldsByKey, key);
      return {
        formFieldId: field.id,
        valueJson: val,
      };
    });
  }
}
