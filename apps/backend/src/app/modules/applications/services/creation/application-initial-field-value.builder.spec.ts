import { ClientErrorCodes } from '../../../../../common/errors';
import { FormFieldType } from '../../../../../models/constants/form-field-type';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationFieldValueTypeValidator } from '../../validators/application-field-value-type.validator';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';
import { ApplicationInitialFieldValueBuilder } from './application-initial-field-value.builder';

const field = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-title',
    fieldKey: 'title',
    fieldType: FormFieldType.TEXT,
    required: true,
    ...overrides,
  }) as FormField;

const template = (fields: FormField[]): FormDefinition =>
  ({ id: 'template-1', fields }) as FormDefinition;

const expectErrorCode = (act: () => void, errorCode: string): void => {
  expect.assertions(1);
  try {
    act();
  } catch (error: unknown) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('ApplicationInitialFieldValueBuilder', () => {
  let builder: ApplicationInitialFieldValueBuilder;

  beforeEach(() => {
    builder = new ApplicationInitialFieldValueBuilder(
      new ApplicationFormValueValidator(
        new ApplicationFieldValueTypeValidator(),
      ),
    );
  });

  it('validates values and maps them to field value rows', () => {
    expect(builder.build(template([field()]), { title: 'Expense' })).toEqual([
      { formFieldId: 'field-title', valueJson: 'Expense' },
    ]);
  });

  it('rejects unknown field keys', () => {
    expectErrorCode(
      () => builder.build(template([field()]), { unknown: 'value' }),
      ClientErrorCodes.APPLICATION_FIELD_UNKNOWN,
    );
  });
});
