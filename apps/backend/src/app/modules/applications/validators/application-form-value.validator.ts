import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { FORM_FIELD_TYPES_WITHOUT_VALUES } from '../../../../models/constants/form-field-type';
import type { Application } from '../../../../models/entities/application.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationFieldValueTypeValidator } from './application-field-value-type.validator';

@Injectable()
export class ApplicationFormValueValidator {
  constructor(
    private readonly fieldValueTypeValidator = new ApplicationFieldValueTypeValidator(),
  ) {}

  buildFieldsByKey(fields: FormField[]): Map<string, FormField> {
    return new Map(fields.map((field) => [field.fieldKey, field]));
  }

  getKnownField(
    fieldsByKey: ReadonlyMap<string, FormField>,
    fieldKey: string,
  ): FormField {
    const field = fieldsByKey.get(fieldKey);
    if (!field) {
      throw clientError(ClientErrorCodes.APPLICATION_FIELD_UNKNOWN);
    }
    return field;
  }

  assertValuesMatchFields(
    fieldsByKey: ReadonlyMap<string, FormField>,
    values: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(values)) {
      const field = this.getKnownField(fieldsByKey, key);
      this.fieldValueTypeValidator.assertValueMatchesFieldType(field, value);
    }
  }

  assertPatchValuesMatchFields(
    fieldsByKey: ReadonlyMap<string, FormField>,
    values: Record<string, unknown>,
    allowedFieldIds?: ReadonlySet<string>,
  ): void {
    for (const [key, value] of Object.entries(values)) {
      const field = this.getKnownField(fieldsByKey, key);
      if (allowedFieldIds && !allowedFieldIds.has(field.id)) {
        throw clientError(
          ClientErrorCodes.APPLICATION_PATCH_FIELD_NOT_IN_CORRECTION,
        );
      }
      this.fieldValueTypeValidator.assertValueMatchesFieldType(field, value);
    }
  }

  assertApplicationValuesSubmittable(
    app: Application,
    fields: FormField[],
  ): void {
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const valueByFieldId = new Map(
      (app.fieldValues ?? []).map((value) => [
        value.formFieldId,
        value.valueJson,
      ]),
    );

    for (const field of fields) {
      if (FORM_FIELD_TYPES_WITHOUT_VALUES.includes(field.fieldType)) {
        continue;
      }
      if (!field.required) {
        continue;
      }
      const value = valueByFieldId.get(field.id);
      if (!this.fieldValueTypeValidator.valuePresent(value)) {
        throw clientError(ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING);
      }
      this.fieldValueTypeValidator.assertValueMatchesFieldType(field, value);
    }

    for (const fieldValue of app.fieldValues ?? []) {
      const field = fieldById.get(fieldValue.formFieldId);
      if (field) {
        this.fieldValueTypeValidator.assertValueMatchesFieldType(
          field,
          fieldValue.valueJson,
        );
      }
    }
  }
}
