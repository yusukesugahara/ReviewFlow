import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { FormField } from '../../../../models/entities/form-field.entity';

/**
 * FormFieldType ごとの値型を検証する validator。
 *
 * class-validator では扱えない動的 field 定義と JSON 値の整合性をここに集約する。
 */
@Injectable()
export class ApplicationFieldValueTypeValidator {
  /** 必須 field の入力有無判定。空文字・空配列・非有限数は未入力として扱う。 */
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

  /** field type に対応する JSON 値の型だけを検証する。必須判定は呼び出し側で行う。 */
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
