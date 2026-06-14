import { ClientErrorCodes } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../../models/constants/correction-request-status';
import { FormFieldType } from '../../../../../models/constants/form-field-type';
import type { Application } from '../../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import type { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import type { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import { ApplicationSubmissionContextLoader } from './application-submission-context.loader';

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
    required: true,
    ...overrides,
  }) as FormField;

const template = (fields: FormField[]): FormDefinition =>
  ({
    id: 'template-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    fields,
  }) as FormDefinition;

const correction = (
  overrides: Partial<CorrectionRequest> = {},
): CorrectionRequest =>
  ({
    id: 'correction-1',
    status: CorrectionRequestStatus.OPEN,
    items: [],
    ...overrides,
  }) as CorrectionRequest;

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

describe('ApplicationSubmissionContextLoader', () => {
  let formDefinitionsRepository: {
    findTemplateByIdInGroup: jest.Mock;
  };
  let correctionRepository: {
    findOpenCorrection: jest.Mock;
  };
  let loader: ApplicationSubmissionContextLoader;

  beforeEach(() => {
    formDefinitionsRepository = {
      findTemplateByIdInGroup: jest.fn(),
    };
    correctionRepository = {
      findOpenCorrection: jest.fn(),
    };
    loader = new ApplicationSubmissionContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      correctionRepository as unknown as ApplicationCorrectionRepository,
      new ApplicationTransitionPolicy(),
    );
  });

  it('loads a draft application with its form definition', async () => {
    const form = template([field()]);
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(form);

    const context = await loader.loadSubmittable('tenant-1', app());

    expect(
      formDefinitionsRepository.findTemplateByIdInGroup,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'template-1',
    });
    expect(context.template).toBe(form);
  });

  it('loads returned applications with an open correction', async () => {
    const openCorrection = correction();
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );
    correctionRepository.findOpenCorrection.mockResolvedValue(openCorrection);

    const context = await loader.loadResubmittable(
      'tenant-1',
      app({ status: ApplicationStatus.RETURNED }),
    );

    expect(correctionRepository.findOpenCorrection).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', applicationId: 'app-1' },
      undefined,
    );
    expect(context.openCorrection).toBe(openCorrection);
  });

  it('rejects resubmission without an open correction', async () => {
    correctionRepository.findOpenCorrection.mockResolvedValue(null);

    await expectErrorCode(
      () =>
        loader.loadResubmittable(
          'tenant-1',
          app({ status: ApplicationStatus.RETURNED }),
        ),
      ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION,
    );
  });

  it('rejects when the form definition is missing', async () => {
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(null);

    await expectErrorCode(
      () => loader.loadSubmittable('tenant-1', app()),
      ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    );
  });
});
