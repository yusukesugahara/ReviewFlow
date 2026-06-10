import { ClientErrorCodes } from '../../../../common/errors';
import {
  FormFieldType,
  type FormFieldTypeValue,
} from '../../../../models/constants/form-field-type';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationFieldValueTypeValidator } from './application-field-value-type.validator';

const field = (fieldType: FormFieldTypeValue): FormField =>
  ({
    id: 'field-1',
    fieldKey: 'field',
    fieldType,
    required: false,
  }) as FormField;

const expectErrorCode = (act: () => void, errorCode: string): void => {
  let caught: unknown;
  try {
    act();
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toMatchObject({ errorCode });
};

describe('ApplicationFieldValueTypeValidator', () => {
  let validator: ApplicationFieldValueTypeValidator;

  beforeEach(() => {
    validator = new ApplicationFieldValueTypeValidator();
  });

  it('checks whether required values are present', () => {
    expect(validator.valuePresent('text')).toBe(true);
    expect(validator.valuePresent('   ')).toBe(false);
    expect(validator.valuePresent(0)).toBe(true);
    expect(validator.valuePresent(Number.NaN)).toBe(false);
    expect(validator.valuePresent(false)).toBe(true);
    expect(validator.valuePresent([])).toBe(false);
  });

  it('accepts values matching field types', () => {
    expect(() =>
      validator.assertValueMatchesFieldType(field(FormFieldType.CHECKBOX), [
        'one',
        'two',
      ]),
    ).not.toThrow();
    expect(() =>
      validator.assertValueMatchesFieldType(field(FormFieldType.CONSENT), true),
    ).not.toThrow();
    expect(() =>
      validator.assertValueMatchesFieldType(
        field(FormFieldType.DESCRIPTION),
        null,
      ),
    ).not.toThrow();
  });

  it('rejects values that do not match field types', () => {
    expectErrorCode(
      () =>
        validator.assertValueMatchesFieldType(field(FormFieldType.CHECKBOX), [
          'one',
          2,
        ]),
      ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID,
    );
    expectErrorCode(
      () =>
        validator.assertValueMatchesFieldType(
          field(FormFieldType.CONSENT),
          false,
        ),
      ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID,
    );
  });
});
