import { ClientErrorCodes } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../../models/entities/approval-step.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import type { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import type { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import { ApplicationReturnForCorrectionContextLoader } from './application-return-for-correction-context.loader';

const step = (
  stepOrder: number,
  overrides: Partial<ApprovalStep> = {},
): ApprovalStep =>
  ({
    id: `step-${stepOrder}`,
    stepOrder,
    stepName: `Step ${stepOrder}`,
    assigneeUserId: `reviewer-${stepOrder}`,
    canReturn: true,
    ...overrides,
  }) as ApprovalStep;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    formDefinitionId: 'template-1',
    status: ApplicationStatus.IN_REVIEW,
    currentStepOrder: 1,
    approvalFlow: { steps: [step(1), step(2)] },
    ...overrides,
  }) as Application;

const template = (fields: FormField[]): FormDefinition =>
  ({
    id: 'template-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
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

describe('ApplicationReturnForCorrectionContextLoader', () => {
  let formDefinitionsRepository: {
    findTemplateByIdInGroup: jest.Mock;
  };
  let correctionRepository: {
    findOpenCorrection: jest.Mock;
  };
  let loader: ApplicationReturnForCorrectionContextLoader;

  beforeEach(() => {
    formDefinitionsRepository = {
      findTemplateByIdInGroup: jest.fn(),
    };
    correctionRepository = {
      findOpenCorrection: jest.fn(),
    };
    loader = new ApplicationReturnForCorrectionContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      correctionRepository as unknown as ApplicationCorrectionRepository,
      new ApplicationTransitionPolicy(),
    );
  });

  it('loads return context for a valid current step and template field', async () => {
    const form = template([{ id: 'field-title' } as FormField]);
    correctionRepository.findOpenCorrection.mockResolvedValue(null);
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(form);

    const context = await loader.load(app(), {
      expectedStepOrder: 1,
      fields: [{ fieldId: 'field-title' }],
    });

    expect(context.currentStep.id).toBe('step-1');
    expect(context.template).toBe(form);
    expect(
      formDefinitionsRepository.findTemplateByIdInGroup,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'template-1',
    });
  });

  it('rejects when an open correction already exists', async () => {
    correctionRepository.findOpenCorrection.mockResolvedValue({
      id: 'correction-1',
    });

    await expectErrorCode(
      () =>
        loader.load(app(), {
          expectedStepOrder: 1,
          fields: [{ fieldId: 'field-title' }],
        }),
      ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN,
    );
  });

  it('rejects return fields outside the form definition', async () => {
    correctionRepository.findOpenCorrection.mockResolvedValue(null);
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([{ id: 'field-title' } as FormField]),
    );

    await expectErrorCode(
      () =>
        loader.load(app(), {
          expectedStepOrder: 1,
          fields: [{ fieldId: 'field-other' }],
        }),
      ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID,
    );
  });

  it('rejects when the form definition is missing', async () => {
    correctionRepository.findOpenCorrection.mockResolvedValue(null);
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(null);

    await expectErrorCode(
      () =>
        loader.load(app(), {
          expectedStepOrder: 1,
          fields: [{ fieldId: 'field-title' }],
        }),
      ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    );
  });
});
