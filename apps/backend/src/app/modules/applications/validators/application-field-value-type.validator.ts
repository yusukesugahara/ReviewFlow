import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { FormField } from '../../../../models/entities/form-field.entity';

@Injectable()
export class ApplicationFieldValueTypeValidator {
  valuePresent(value: unknown): boolean {
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

  assertValueMatchesFieldType(field: FormField, value: unknown): void {
    switch (field.fieldType) {
      case FormFieldType.TEXT:
      case FormFieldType.TEXTAREA:
      case FormFieldType.DATE:
      case FormFieldType.SELECT:
      case FormFieldType.RADIO:
        this.assertStringValue(value);
        break;
      case FormFieldType.NUMBER:
        this.assertNumberValue(value);
        break;
      case FormFieldType.CHECKBOX:
        this.assertStringArrayValue(value);
        break;
      case FormFieldType.CONSENT:
        this.assertConsentValue(value);
        break;
      case FormFieldType.DESCRIPTION:
      case FormFieldType.SECTION:
        this.assertDisplayOnlyValue(value);
        break;
      default:
        this.throwInvalidValue();
    }
  }

  private assertStringValue(value: unknown): void {
    if (typeof value !== 'string') {
      this.throwInvalidValue();
    }
  }

  private assertNumberValue(value: unknown): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.throwInvalidValue();
    }
  }

  private assertStringArrayValue(value: unknown): void {
    if (
      !Array.isArray(value) ||
      !value.every((item) => typeof item === 'string')
    ) {
      this.throwInvalidValue();
    }
  }

  private assertConsentValue(value: unknown): void {
    if (value !== true) {
      this.throwInvalidValue();
    }
  }

  private assertDisplayOnlyValue(value: unknown): void {
    if (value !== null && value !== undefined) {
      this.throwInvalidValue();
    }
  }

  private throwInvalidValue(): never {
    throw clientError(ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
  }
}
