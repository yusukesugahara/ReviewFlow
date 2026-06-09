import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
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
  let service: ApplicationFieldValuePatchService;
  let applicationsRepository: {
    findTemplateByIdInGroup: jest.Mock;
    findOpenCorrection: jest.Mock;
    findExistingFieldValues: jest.Mock;
    createFieldValue: jest.Mock;
    saveApplicationPatch: jest.Mock;
  };

  beforeEach(() => {
    applicationsRepository = {
      findTemplateByIdInGroup: jest.fn(),
      findOpenCorrection: jest.fn(),
      findExistingFieldValues: jest.fn(),
      createFieldValue: jest.fn((value: object) => ({ ...value })),
      saveApplicationPatch: jest.fn(),
    };
    service = new ApplicationFieldValuePatchService(
      applicationsRepository as unknown as ApplicationsRepository,
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
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );
    applicationsRepository.findExistingFieldValues.mockResolvedValue([
      existing,
    ]);

    await service.applyPatch('tenant-1', app(), { values: { title: 'new' } });

    expect(existing.valueJson).toBe('new');
    expect(applicationsRepository.saveApplicationPatch).toHaveBeenCalledWith(
      expect.objectContaining({ values: [existing] }),
    );
  });

  /**
   * フォーム定義を差し替えると既存 field values を削除すること
   */
  it('deletes existing values when changing form definition', async () => {
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field({ id: 'field-next' })]),
    );
    applicationsRepository.findExistingFieldValues.mockResolvedValue([]);

    await service.applyPatch('tenant-1', app(), {
      formDefinitionId: 'template-next',
    });

    expect(applicationsRepository.saveApplicationPatch).toHaveBeenCalledWith(
      expect.objectContaining({ formDefinitionId: 'template-next' }),
    );
  });

  /**
   * draft / published の公開状態だけを更新できること
   */
  it('updates draft or published status without field value changes', async () => {
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );
    applicationsRepository.findExistingFieldValues.mockResolvedValue([]);

    await service.applyPatch('tenant-1', app(), {
      status: ApplicationStatus.PUBLISHED,
    });

    expect(applicationsRepository.saveApplicationPatch).toHaveBeenCalledWith(
      expect.objectContaining({ status: ApplicationStatus.PUBLISHED }),
    );
  });

  /**
   * 差し戻し中は correction 対象外フィールドの更新を拒否すること
   */
  it('rejects returned patches outside correction target fields', async () => {
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field({ id: 'field-title' })]),
    );
    applicationsRepository.findOpenCorrection.mockResolvedValue({
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

  /**
   * 差し戻し中は公開状態の変更を拒否すること
   */
  it('rejects returned status changes', async () => {
    await expectErrorCode(
      () =>
        service.applyPatch(
          'tenant-1',
          app({ status: ApplicationStatus.RETURNED }),
          { status: ApplicationStatus.PUBLISHED },
        ),
      ClientErrorCodes.APPLICATION_NOT_EDITABLE,
    );
  });
});
