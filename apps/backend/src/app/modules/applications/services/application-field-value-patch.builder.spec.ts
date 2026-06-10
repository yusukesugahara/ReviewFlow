import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import type { Application } from '../../../../models/entities/application.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import type { ApplicationSubmissionRepository } from '../../../../models/repositories/application-submission.repository';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
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
  const fieldsByKey = new ApplicationFormValueValidator().buildFieldsByKey(
    fields,
  );
  return { app: app(), fieldsByKey };
};

describe('ApplicationFieldValuePatchBuilder', () => {
  let submissionRepository: {
    findExistingFieldValues: jest.Mock;
    createFieldValue: jest.Mock;
  };
  let builder: ApplicationFieldValuePatchBuilder;

  beforeEach(() => {
    submissionRepository = {
      findExistingFieldValues: jest.fn(),
      createFieldValue: jest.fn((value: object) => ({ ...value })),
    };
    builder = new ApplicationFieldValuePatchBuilder(
      submissionRepository as unknown as ApplicationSubmissionRepository,
      new ApplicationFormValueValidator(),
    );
  });

  it('mutates existing values for known fields', async () => {
    const existing = {
      id: 'value-1',
      formFieldId: 'field-title',
      valueJson: 'old',
    } as ApplicationFieldValue;
    submissionRepository.findExistingFieldValues.mockResolvedValue([existing]);

    const values = await builder.build(context([field()]), { title: 'new' });

    expect(existing.valueJson).toBe('new');
    expect(values).toEqual([existing]);
  });

  it('creates values for fields without an existing value', async () => {
    submissionRepository.findExistingFieldValues.mockResolvedValue([]);

    const values = await builder.build(context([field()]), { title: 'new' });

    expect(submissionRepository.createFieldValue).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      formFieldId: 'field-title',
      valueJson: 'new',
    });
    expect(values).toEqual([
      expect.objectContaining({ formFieldId: 'field-title' }),
    ]);
  });
});
