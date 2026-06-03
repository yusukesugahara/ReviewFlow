import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { FormFieldType } from '../../../models/constants/form-field-type';
import type { Application } from '../../../models/entities/application.entity';
import type { FormField } from '../../../models/entities/form-field.entity';

@Injectable()
export class ApplicationFormValueValidator {
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
      this.assertValueMatchesFieldType(field, value);
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
      this.assertValueMatchesFieldType(field, value);
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
      if (!field.required) {
        continue;
      }
      const value = valueByFieldId.get(field.id);
      if (!this.valuePresent(value)) {
        throw clientError(ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING);
      }
      this.assertValueMatchesFieldType(field, value);
    }

    for (const fieldValue of app.fieldValues ?? []) {
      const field = fieldById.get(fieldValue.formFieldId);
      if (field) {
        this.assertValueMatchesFieldType(field, fieldValue.valueJson);
      }
    }
  }

  private valuePresent(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    if (typeof value === 'boolean') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  private assertValueMatchesFieldType(field: FormField, value: unknown): void {
    switch (field.fieldType) {
      case FormFieldType.TEXT:
      case FormFieldType.TEXTAREA:
      case FormFieldType.DATE:
      case FormFieldType.SELECT:
      case FormFieldType.RADIO:
        if (typeof value !== 'string') {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      case FormFieldType.NUMBER:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      case FormFieldType.CHECKBOX:
        if (
          !Array.isArray(value) ||
          !value.every((item) => typeof item === 'string')
        ) {
          throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
        }
        break;
      default:
        throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
    }
  }
}
