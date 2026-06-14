import { ClientErrorCodes } from '../../../../../common/errors';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../../models/constants/form-field-type';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import type { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicationCreationContextLoader } from './application-creation-context.loader';

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

describe('ApplicationCreationContextLoader', () => {
  let formDefinitionsRepository: {
    findPublishedTemplatesForApplicationCreation: jest.Mock;
  };
  let flowResolver: {
    resolveActiveFlow: jest.Mock;
  };
  let loader: ApplicationCreationContextLoader;

  beforeEach(() => {
    formDefinitionsRepository = {
      findPublishedTemplatesForApplicationCreation: jest.fn(),
    };
    flowResolver = {
      resolveActiveFlow: jest.fn().mockResolvedValue({
        id: 'flow-1',
      }),
    };
    loader = new ApplicationCreationContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      flowResolver as unknown as ApplicationApprovalFlowResolver,
    );
  });

  it('loads a published template and active approval flow', async () => {
    const form = template();
    formDefinitionsRepository.findPublishedTemplatesForApplicationCreation.mockResolvedValue(
      [form],
    );

    const context = await loader.load('tenant-1', {
      groupId: 'group-1',
      formDefinitionId: 'template-1',
      approvalFlowId: 'flow-1',
    });

    expect(
      formDefinitionsRepository.findPublishedTemplatesForApplicationCreation,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'template-1',
    });
    expect(flowResolver.resolveActiveFlow).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
      'flow-1',
    );
    expect(context.template).toBe(form);
    expect(context.flow.id).toBe('flow-1');
  });

  it('rejects when multiple published templates match an unspecified form', async () => {
    formDefinitionsRepository.findPublishedTemplatesForApplicationCreation.mockResolvedValue(
      [template(), template([field({ id: 'field-other' })])],
    );

    await expectErrorCode(
      () => loader.load('tenant-1', { groupId: 'group-1' }),
      ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS,
    );
  });

  it('rejects when no published template is available', async () => {
    formDefinitionsRepository.findPublishedTemplatesForApplicationCreation.mockResolvedValue(
      [],
    );

    await expectErrorCode(
      () => loader.load('tenant-1', { groupId: 'group-1' }),
      ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    );
  });
});
