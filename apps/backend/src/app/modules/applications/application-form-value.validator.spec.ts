import { ClientErrorCodes } from '../../../common/errors';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import type { Application } from '../../../models/entities/application.entity';
import type { FormField } from '../../../models/entities/form-field.entity';
import { ApplicationFormValueValidator } from './application-form-value.validator';

const field = (overrides: Partial<FormField>): FormField =>
  ({
    id: overrides.id ?? 'field-1',
    fieldKey: overrides.fieldKey ?? 'title',
    fieldType: overrides.fieldType ?? FormFieldType.TEXT,
    required: overrides.required ?? false,
    ...overrides,
  }) as FormField;

const appWithValues = (
  values: Array<{ formFieldId: string; valueJson: unknown }>,
): Application =>
  ({
    id: 'app-1',
    status: ApplicationStatus.DRAFT,
    fieldValues: values,
  }) as Application;

const expectErrorCode = (act: () => void, errorCode: string): void => {
  expect.assertions(1);
  try {
    act();
  } catch (error: unknown) {
    expect(error).toMatchObject({ errorCode });
  }
};

/**
 * ApplicationFormValueValidator のテスト
 *
 * @group application-form-value-validator
 */
describe('ApplicationFormValueValidator', () => {
  const validator = new ApplicationFormValueValidator();

  /**
   * フォーム定義のフィールドに一致する値を受け入れること
   */
  it('accepts values that match form definition fields', () => {
    const fieldsByKey = validator.buildFieldsByKey([
      field({ id: 'text-1', fieldKey: 'title', fieldType: FormFieldType.TEXT }),
      field({
        id: 'num-1',
        fieldKey: 'amount',
        fieldType: FormFieldType.NUMBER,
      }),
      field({
        id: 'check-1',
        fieldKey: 'tags',
        fieldType: FormFieldType.CHECKBOX,
      }),
    ]);

    expect(() =>
      validator.assertValuesMatchFields(fieldsByKey, {
        title: 'Travel',
        amount: 1200,
        tags: ['transport', 'daily'],
      }),
    ).not.toThrow();
  });

  /**
   * 未知のフィールドキーを拒否すること
   */
  it('rejects unknown field keys', () => {
    const fieldsByKey = validator.buildFieldsByKey([
      field({ fieldKey: 'title' }),
    ]);

    expectErrorCode(
      () =>
        validator.assertValuesMatchFields(fieldsByKey, { missing: 'value' }),
      ClientErrorCodes.APPLICATION_FIELD_UNKNOWN,
    );
  });

  /**
   * フィールド型に一致しない値を拒否すること
   */
  it('rejects values that do not match field type', () => {
    const fieldsByKey = validator.buildFieldsByKey([
      field({ fieldKey: 'amount', fieldType: FormFieldType.NUMBER }),
    ]);

    expectErrorCode(() => {
      validator.assertValuesMatchFields(fieldsByKey, { amount: '1200' });
    }, ClientErrorCodes.APPLICATION_FIELD_VALUE_INVALID);
  });

  /**
   * 修正対象外のフィールドに対する値を拒否すること
   */
  it('rejects patch values outside the open correction target fields', () => {
    const fieldsByKey = validator.buildFieldsByKey([
      field({ id: 'field-title', fieldKey: 'title' }),
    ]);

    expectErrorCode(
      () =>
        validator.assertPatchValuesMatchFields(
          fieldsByKey,
          { title: 'updated' },
          new Set(['other-field']),
        ),
      ClientErrorCodes.APPLICATION_PATCH_FIELD_NOT_IN_CORRECTION,
    );
  });

  /**
   * 必須フィールドが未入力の場合に拒否すること
   */
  it('requires required fields before submit', () => {
    expectErrorCode(
      () =>
        validator.assertApplicationValuesSubmittable(
          appWithValues([{ formFieldId: 'title', valueJson: '   ' }]),
          [
            field({
              id: 'title',
              fieldKey: 'title',
              fieldType: FormFieldType.TEXT,
              required: true,
            }),
          ],
        ),
      ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING,
    );
  });

  /**
   * 既存の申請値を検証すること
   */
  it('validates existing application values before submit', () => {
    expectErrorCode(
      () =>
        validator.assertApplicationValuesSubmittable(
          appWithValues([{ formFieldId: 'amount', valueJson: Number.NaN }]),
          [
            field({
              id: 'amount',
              fieldKey: 'amount',
              fieldType: FormFieldType.NUMBER,
              required: true,
            }),
          ],
        ),
      ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING,
    );
  });
});
