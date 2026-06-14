import { ClientErrorCodes } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../../models/constants/form-field-type';
import type { ApprovalFlow } from '../../../../../models/entities/approval-flow.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationCreationRepository } from '../../../../../models/repositories/application-creation.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicationFieldValueTypeValidator } from '../../validators/application-field-value-type.validator';
import { ApplicationCreationContextLoader } from './application-creation-context.loader';
import { ApplicationCreationService } from './application-creation.service';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';
import { ApplicationInitialFieldValueBuilder } from './application-initial-field-value.builder';

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
  let flowResolver: { resolveActiveFlow: jest.Mock };
  let service: ApplicationCreationService;
  let creationRepository: {
    createApplicationWithValues: jest.Mock;
    findCreatedApplication: jest.Mock;
  };
  let formDefinitionsRepository: {
    findPublishedTemplatesForApplicationCreation: jest.Mock;
  };

  beforeEach(() => {
    creationRepository = {
      createApplicationWithValues: jest.fn().mockResolvedValue('app-1'),
      findCreatedApplication: jest.fn().mockResolvedValue({ id: 'app-1' }),
    };
    formDefinitionsRepository = {
      findPublishedTemplatesForApplicationCreation: jest.fn(),
    };
    flowResolver = {
      resolveActiveFlow: jest.fn(() =>
        Promise.resolve({ id: 'flow-1' } as ApprovalFlow),
      ),
    };
    const contextLoader = new ApplicationCreationContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      flowResolver as unknown as ApplicationApprovalFlowResolver,
    );
    const initialFieldValueBuilder = new ApplicationInitialFieldValueBuilder(
      new ApplicationFormValueValidator(
        new ApplicationFieldValueTypeValidator(),
      ),
    );
    service = new ApplicationCreationService(
      creationRepository as unknown as ApplicationCreationRepository,
      contextLoader,
      initialFieldValueBuilder,
    );
  });

  /**
   * 公開済みフォームと承認フローから申請と初期値を保存すること
   */
  it('creates an application with initial field values', async () => {
    formDefinitionsRepository.findPublishedTemplatesForApplicationCreation.mockResolvedValue(
      [template()],
    );

    await service.create('tenant-1', 'user@example.com', 'user-1', {
      groupId: 'group-1',
      formDefinitionId: 'template-1',
      values: { title: 'Expense' },
    });

    expect(creationRepository.createApplicationWithValues).toHaveBeenCalledWith(
      expect.objectContaining({
        applicantEmail: 'user@example.com',
        applicantUserId: 'user-1',
        formDefinitionId: 'template-1',
        approvalFlowId: 'flow-1',
        status: ApplicationStatus.DRAFT,
        values: [
          expect.objectContaining({
            formFieldId: 'field-title',
            valueJson: 'Expense',
          }),
        ],
      }),
    );
  });

  /**
   * フォーム指定なしで複数公開フォームがある場合に拒否すること
   */
  it('rejects ambiguous published templates', async () => {
    formDefinitionsRepository.findPublishedTemplatesForApplicationCreation.mockResolvedValue(
      [template(), template([field({ id: 'field-other' })])],
    );

    await expectErrorCode(
      () =>
        service.create('tenant-1', 'user@example.com', null, {
          groupId: 'group-1',
        }),
      ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS,
    );
  });
});
