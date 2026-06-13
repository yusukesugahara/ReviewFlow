import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import type { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationCorrectionRepository } from '../../../../models/repositories/application-correction.repository';
import { ApplicationSubmissionRepository } from '../../../../models/repositories/application-submission.repository';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { ApplicationFieldValueTypeValidator } from '../validators/application-field-value-type.validator';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
import { ApplicationSubmissionContextLoader } from './application-submission-context.loader';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

const step = (overrides: Partial<ApprovalStep> = {}): ApprovalStep =>
  ({
    id: 'step-1',
    stepOrder: 1,
    stepName: 'Step 1',
    assigneeUserId: 'reviewer-1',
    canReturn: true,
    ...overrides,
  }) as ApprovalStep;

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

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    formDefinitionId: 'template-1',
    status: ApplicationStatus.DRAFT,
    currentStepOrder: null,
    submittedAt: null,
    approvalFlow: { steps: [step()] },
    fieldValues: [{ formFieldId: 'field-title', valueJson: 'hello' }],
    ...overrides,
  }) as Application;

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
 * ApplicationSubmissionService のテスト
 *
 * @group application-submission-service
 */
describe('ApplicationSubmissionService', () => {
  let service: ApplicationSubmissionService;
  let formDefinitionsRepository: {
    findTemplateByIdInGroup: jest.Mock;
  };
  let correctionRepository: {
    findOpenCorrection: jest.Mock;
  };
  let submissionRepository: {
    saveSubmittedApplication: jest.Mock;
    saveResubmittedApplication: jest.Mock;
  };

  beforeEach(() => {
    formDefinitionsRepository = {
      findTemplateByIdInGroup: jest.fn(),
    };
    correctionRepository = {
      findOpenCorrection: jest.fn(),
    };
    submissionRepository = {
      saveSubmittedApplication: jest.fn(),
      saveResubmittedApplication: jest.fn(),
    };
    const transitionPolicy = new ApplicationTransitionPolicy();
    const contextLoader = new ApplicationSubmissionContextLoader(
      formDefinitionsRepository as unknown as FormDefinitionsRepository,
      correctionRepository as unknown as ApplicationCorrectionRepository,
      transitionPolicy,
    );
    service = new ApplicationSubmissionService(
      contextLoader,
      submissionRepository as unknown as ApplicationSubmissionRepository,
      new ApplicationFormValueValidator(
        new ApplicationFieldValueTypeValidator(),
      ),
      transitionPolicy,
    );
  });

  /**
   * 必須項目が揃っていればレビューを開始すること
   */
  it('submits a draft application when required values are present', async () => {
    const target = app();
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );

    await service.submit('tenant-1', target);

    expect(target.status).toBe(ApplicationStatus.IN_REVIEW);
    expect(target.currentStepOrder).toBe(1);
    expect(submissionRepository.saveSubmittedApplication).toHaveBeenCalledWith(
      target,
    );
  });

  /**
   * 必須項目不足の申請提出を拒否すること
   */
  it('rejects submit when required values are missing', async () => {
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );

    await expectErrorCode(
      () =>
        service.submit(
          'tenant-1',
          app({
            fieldValues: [
              { formFieldId: 'field-title', valueJson: '' },
            ] as ApplicationFieldValue[],
          }),
        ),
      ClientErrorCodes.APPLICATION_REQUIRED_FIELDS_MISSING,
    );
  });

  /**
   * 再提出時に open correction を解決済みにすること
   */
  it('resolves open correction when resubmitting', async () => {
    const target = app({
      status: ApplicationStatus.RETURNED,
      fieldValues: [
        { formFieldId: 'field-title', valueJson: 'fixed' },
      ] as ApplicationFieldValue[],
    });
    const item = { id: 'item-1', isResolved: false };
    const correction = {
      id: 'correction-1',
      status: CorrectionRequestStatus.OPEN,
      resolvedAt: null,
      items: [item],
    } as CorrectionRequest;
    correctionRepository.findOpenCorrection.mockResolvedValue(correction);
    formDefinitionsRepository.findTemplateByIdInGroup.mockResolvedValue(
      template([field()]),
    );
    submissionRepository.saveResubmittedApplication.mockImplementation(
      ({
        app,
        openCorrection,
      }: {
        app: Application;
        openCorrection: CorrectionRequest;
      }) => {
        openCorrection.status = CorrectionRequestStatus.RESOLVED;
        openCorrection.resolvedAt = new Date();
        for (const correctionItem of openCorrection.items ?? []) {
          correctionItem.isResolved = true;
        }
        return Promise.resolve(app);
      },
    );

    await service.resubmit('tenant-1', target);

    expect(correction.status).toBe(CorrectionRequestStatus.RESOLVED);
    expect(correction.resolvedAt).toBeInstanceOf(Date);
    expect(item.isResolved).toBe(true);
    expect(target.status).toBe(ApplicationStatus.IN_REVIEW);
    expect(submissionRepository.saveResubmittedApplication).toHaveBeenCalled();
  });
});
