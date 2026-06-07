import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
import { ApplicationFieldValuePatchService } from './application-field-value-patch.service';

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    formDefinitionId: 'template-1',
    approvalFlowId: 'flow-1',
    status: ApplicationStatus.DRAFT,
    ...overrides,
  }) as Application;

const field = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-title',
    tenantId: 'tenant-1',
    formDefinitionId: 'template-1',
    fieldKey: 'title',
    label: 'Title',
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

/**
 * ApplicationFieldValuePatchService のテスト
 *
 * @group application-field-value-patch-service
 */
describe('ApplicationFieldValuePatchService', () => {
  let appsRepo: { manager: { transaction: jest.Mock } };
  let fieldValuesRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let correctionRequestsRepo: { findOne: jest.Mock };
  let templatesRepo: { findOne: jest.Mock };
  let service: ApplicationFieldValuePatchService;

  beforeEach(() => {
    fieldValuesRepo = {
      find: jest.fn(),
      create: jest.fn((value: object) => ({ ...value })),
      save: jest.fn((value: ApplicationFieldValue[]) => Promise.resolve(value)),
      delete: jest.fn(() => Promise.resolve()),
    };
    appsRepo = {
      manager: {
        transaction: jest.fn((fn: (em: unknown) => unknown) =>
          Promise.resolve(
            fn({
              getRepository: (entity: unknown) =>
                entity === Application
                  ? { save: jest.fn((value: Application) => value) }
                  : fieldValuesRepo,
            }),
          ),
        ),
      },
    };
    correctionRequestsRepo = { findOne: jest.fn() };
    templatesRepo = { findOne: jest.fn() };
    service = new ApplicationFieldValuePatchService(
      appsRepo as never,
      fieldValuesRepo as never,
      correctionRequestsRepo as never,
      templatesRepo as never,
      new ApplicationFormValueValidator(),
    );
  });

  /**
   * draft の値を更新し、既存値を保存すること
   */
  it('updates existing draft field values', async () => {
    const existing = {
      id: 'value-1',
      formFieldId: 'field-title',
      valueJson: 'old',
    } as ApplicationFieldValue;
    templatesRepo.findOne.mockResolvedValue(template([field()]));
    fieldValuesRepo.find.mockResolvedValue([existing]);

    await service.applyPatch('tenant-1', app(), { values: { title: 'new' } });

    expect(existing.valueJson).toBe('new');
    expect(fieldValuesRepo.save).toHaveBeenCalledWith([existing]);
  });

  /**
   * フォーム定義を差し替えると既存 field values を削除すること
   */
  it('deletes existing values when changing form definition', async () => {
    templatesRepo.findOne.mockResolvedValue(
      template([field({ id: 'field-next' })]),
    );
    fieldValuesRepo.find.mockResolvedValue([]);

    await service.applyPatch('tenant-1', app(), {
      formDefinitionId: 'template-next',
    });

    expect(fieldValuesRepo.delete).toHaveBeenCalledWith({
      applicationId: 'app-1',
    });
  });

  /**
   * 差し戻し中は correction 対象外フィールドの更新を拒否すること
   */
  it('rejects returned patches outside correction target fields', async () => {
    templatesRepo.findOne.mockResolvedValue(
      template([field({ id: 'field-title' })]),
    );
    correctionRequestsRepo.findOne.mockResolvedValue({
      id: 'correction-1',
      status: CorrectionRequestStatus.OPEN,
      items: [{ formFieldId: 'field-other' }],
    });

    await expectErrorCode(
      () =>
        service.applyPatch(
          'tenant-1',
          app({ status: ApplicationStatus.RETURNED }),
          { values: { title: 'new' } },
        ),
      ClientErrorCodes.APPLICATION_PATCH_FIELD_NOT_IN_CORRECTION,
    );
  });
});
