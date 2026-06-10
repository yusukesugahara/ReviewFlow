import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { Application } from '../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import type { ApplicationCorrectionRepository } from '../../../../models/repositories/application-correction.repository';
import type { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { ApplicationPatchPolicy } from '../policies/application-patch.policy';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
import { ApplicationPatchContextLoader } from './application-patch-context.loader';

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    formDefinitionId: 'template-1',
    status: ApplicationStatus.DRAFT,
    ...overrides,
  }) as Application;

const field = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-title',
    fieldKey: 'title',
    fieldType: FormFieldType.TEXT,
    required: false,
    ...overrides,
  }) as FormField;

const template = (fields: FormField[]): FormDefinition =>
  ({
    id: 'template-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    status: FormDefinitionStatus.PUBLISHED,
    fields,
  }) as FormDefinition;

const expectErrorCode = async (
  act: () => Promise<unknown>,
  errorCode: string,
): Promise<void> => {
  expect.assertions(1);
  try {
    await act();
  } catch (error: unknown) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('ApplicationPatchContextLoader', () => {
  let formDefinitionsRepository: {
    findTemplateByIdInGroup: jest.Mock;
  };
  let correctionRepository: {
    findOpenCorrection: jest.Mock;
  };
  let loader: ApplicationPatchContextLoader;

  beforeEach(() => {
    formDefinitionsRepository = {
      findTemplateByIdInGroup: jest.fn(),
    };
    correctionRepository = {
      findOpenCorrection: jest.fn(),
    };
    loader = new ApplicationPatchContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      correctionRepository as unknown as ApplicationCorrectionRepository,
      new ApplicationPatchPolicy(),
      new ApplicationFormValueValidator(),
    );
  });

  it('loads a published replacement template within the application group', async () => {
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );

    const context = await loader.load('tenant-1', app(), {
      formDefinitionId: 'template-2',
    });

    expect(
      formDefinitionsRepository.findTemplateByIdInGroup,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'template-2',
      onlyPublished: true,
    });
    expect(context.fieldsByKey.has('title')).toBe(true);
    expect(context.allowedFieldIds).toBeUndefined();
  });

  it('loads correction target field ids for returned applications', async () => {
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );
    correctionRepository.findOpenCorrection.mockResolvedValue({
      id: 'correction-1',
      status: CorrectionRequestStatus.OPEN,
      items: [{ formFieldId: 'field-title' }],
    });

    const context = await loader.load(
      'tenant-1',
      app({ status: ApplicationStatus.RETURNED }),
      { values: { title: 'fixed' } },
    );

    expect(correctionRepository.findOpenCorrection).toHaveBeenCalledWith(
      'app-1',
    );
    expect(context.allowedFieldIds).toEqual(new Set(['field-title']));
  });

  it('rejects missing form definitions', async () => {
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(null);

    await expectErrorCode(
      () => loader.load('tenant-1', app(), { values: { title: 'next' } }),
      ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    );
  });
});
