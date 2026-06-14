import { FormFieldType } from '../../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../../models/entities/application-field-value.entity';
import type { Application } from '../../../../../models/entities/application.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationFieldValueTypeValidator } from '../../validators/application-field-value-type.validator';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';
import { ApplicationFieldValuePatchBuilder } from './application-field-value-patch.builder';
import type { ApplicationPatchContext } from './application-patch-context.loader';

const field = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-title',
    tenantId: 'tenant-1',
    formDefinitionId: 'template-1',
    fieldKey: 'title',
    fieldType: FormFieldType.TEXT,
    required: false,
    ...overrides,
  }) as FormField;

const app = (): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
  }) as Application;

const context = (fields: FormField[]): ApplicationPatchContext => {
  const fieldsByKey = new ApplicationFormValueValidator(
    new ApplicationFieldValueTypeValidator(),
  ).buildFieldsByKey(fields);
  return { app: app(), fieldsByKey };
};

describe('ApplicationFieldValuePatchBuilder', () => {
  let builder: ApplicationFieldValuePatchBuilder;

  beforeEach(() => {
    builder = new ApplicationFieldValuePatchBuilder(
      new ApplicationFormValueValidator(
        new ApplicationFieldValueTypeValidator(),
      ),
    );
  });

  it('mutates existing values for known fields', () => {
    const existing = {
      id: 'value-1',
      formFieldId: 'field-title',
      valueJson: 'old',
    } as ApplicationFieldValue;

    const values = builder.build(context([field()]), { title: 'new' }, [
      existing,
    ]);

    expect(existing.valueJson).toBe('new');
    expect(values).toEqual([existing]);
  });

  it('creates values for fields without an existing value', () => {
    const values = builder.build(context([field()]), { title: 'new' }, []);

    expect(values).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        applicationId: 'app-1',
        formFieldId: 'field-title',
        valueJson: 'new',
      }),
    ]);
  });
});
