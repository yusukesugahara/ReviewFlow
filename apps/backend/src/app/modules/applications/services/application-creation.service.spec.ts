import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

const field = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-title',
    fieldKey: 'title',
    fieldType: FormFieldType.TEXT,
    required: false,
    ...overrides,
  }) as FormField;

const template = (fields: FormField[] = [field()]): FormDefinition =>
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
 * ApplicationCreationService のテスト
 *
 * @group application-creation-service
 */
describe('ApplicationCreationService', () => {
  let appsRepo: { findOne: jest.Mock; manager: { transaction: jest.Mock } };
  let fieldValuesRepo: { create: jest.Mock; save: jest.Mock };
  let templatesRepo: { find: jest.Mock; findOne: jest.Mock };
  let flowResolver: { resolveActiveFlow: jest.Mock };
  let appRepo: { create: jest.Mock; save: jest.Mock };
  let service: ApplicationCreationService;

  beforeEach(() => {
    appRepo = {
      create: jest.fn((value: Partial<Application>) => ({ ...value })),
      save: jest.fn((value: Application) =>
        Promise.resolve({ ...value, id: 'app-1' }),
      ),
    };
    fieldValuesRepo = {
      create: jest.fn((value: Partial<ApplicationFieldValue>) => ({
        ...value,
      })),
      save: jest.fn((value: ApplicationFieldValue) => Promise.resolve(value)),
    };
    appsRepo = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn((fn: (em: unknown) => unknown) =>
          Promise.resolve(
            fn({
              getRepository: (entity: unknown) =>
                entity === Application ? appRepo : fieldValuesRepo,
            }),
          ),
        ),
      },
    };
    templatesRepo = { find: jest.fn(), findOne: jest.fn() };
    flowResolver = {
      resolveActiveFlow: jest.fn(() =>
        Promise.resolve({ id: 'flow-1' } as ApprovalFlow),
      ),
    };
    appsRepo.findOne.mockResolvedValue({ id: 'app-1' });
    service = new ApplicationCreationService(
      appsRepo as never,
      fieldValuesRepo as never,
      templatesRepo as never,
      flowResolver as unknown as ApplicationApprovalFlowResolver,
      new ApplicationFormValueValidator(),
    );
  });

  /**
   * 公開済みフォームと承認フローから申請と初期値を保存すること
   */
  it('creates an application with initial field values', async () => {
    templatesRepo.findOne.mockResolvedValue(template());

    await service.create('tenant-1', 'user@example.com', 'user-1', {
      groupId: 'group-1',
      formDefinitionId: 'template-1',
      values: { title: 'Expense' },
    });

    expect(appRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        applicantEmail: 'user@example.com',
        applicantUserId: 'user-1',
        formDefinitionId: 'template-1',
        approvalFlowId: 'flow-1',
        status: ApplicationStatus.DRAFT,
      }),
    );
    expect(fieldValuesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'app-1',
        formFieldId: 'field-title',
        valueJson: 'Expense',
      }),
    );
  });

  /**
   * フォーム指定なしで複数公開フォームがある場合に拒否すること
   */
  it('rejects ambiguous published templates', async () => {
    templatesRepo.find.mockResolvedValue([
      template(),
      template([field({ id: 'field-other' })]),
    ]);

    await expectErrorCode(
      () =>
        service.create('tenant-1', 'user@example.com', null, {
          groupId: 'group-1',
        }),
      ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS,
    );
  });
});
