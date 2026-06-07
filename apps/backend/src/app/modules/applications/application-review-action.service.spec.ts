import { ClientErrorCodes } from '../../../common/errors';
import { ApplicationApprovalAction } from '../../../models/constants/application-approval-action';
import { ApplicationStatus } from '../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../models/constants/correction-request-status';
import type { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { Application } from '../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../models/entities/approval-step.entity';
import type { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import type { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import type { FormDefinition } from '../../../models/entities/form-definition.entity';
import type { FormField } from '../../../models/entities/form-field.entity';
import { ApplicationReviewActionService } from './application-review-action.service';
import { ApplicationTransitionPolicy } from './application-transition.policy';

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
    name: 'Expense',
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
 * ApplicationReviewActionService のテスト
 *
 * @group application-review-action-service
 */
describe('ApplicationReviewActionService', () => {
  let appsRepo: { manager: { transaction: jest.Mock } };
  let correctionRequestsRepo: { findOne: jest.Mock };
  let templatesRepo: { findOne: jest.Mock };
  let approvalRepo: { create: jest.Mock; save: jest.Mock };
  let appRepo: { save: jest.Mock };
  let correctionRepo: { create: jest.Mock; save: jest.Mock };
  let correctionItemRepo: { create: jest.Mock; save: jest.Mock };
  let service: ApplicationReviewActionService;

  beforeEach(() => {
    approvalRepo = {
      create: jest.fn((value: Partial<ApplicationApproval>) => ({ ...value })),
      save: jest.fn((value: ApplicationApproval) => Promise.resolve(value)),
    };
    appRepo = { save: jest.fn((value: Application) => Promise.resolve(value)) };
    correctionRepo = {
      create: jest.fn((value: Partial<CorrectionRequest>) => ({ ...value })),
      save: jest.fn((value: CorrectionRequest) =>
        Promise.resolve({ ...value, id: 'correction-1' }),
      ),
    };
    correctionItemRepo = {
      create: jest.fn((value: Partial<CorrectionRequestItem>) => ({
        ...value,
      })),
      save: jest.fn((value: CorrectionRequestItem) => Promise.resolve(value)),
    };
    appsRepo = {
      manager: {
        transaction: jest.fn((fn: (em: unknown) => unknown) =>
          Promise.resolve(
            fn({
              getRepository: (entity: unknown) => {
                if (entity === Application) {
                  return appRepo;
                }
                if (
                  (entity as { name?: string }).name === 'ApplicationApproval'
                ) {
                  return approvalRepo;
                }
                if (
                  (entity as { name?: string }).name === 'CorrectionRequest'
                ) {
                  return correctionRepo;
                }
                return correctionItemRepo;
              },
            }),
          ),
        ),
      },
    };
    correctionRequestsRepo = { findOne: jest.fn() };
    templatesRepo = { findOne: jest.fn() };
    service = new ApplicationReviewActionService(
      appsRepo as never,
      correctionRequestsRepo as never,
      templatesRepo as never,
      new ApplicationTransitionPolicy(),
    );
  });

  /**
   * 中間ステップの承認を記録し次ステップへ進めること
   */
  it('records approval and advances to next step', async () => {
    const target = app();

    await service.approve(target, 'actor-1', { comment: ' ok ' });

    expect(approvalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ApplicationApprovalAction.APPROVED,
        comment: 'ok',
        approvalStepId: 'step-1',
      }),
    );
    expect(target.status).toBe(ApplicationStatus.IN_REVIEW);
    expect(target.currentStepOrder).toBe(2);
  });

  /**
   * 最終ステップの却下を記録し申請を rejected にすること
   */
  it('records rejection and rejects application', async () => {
    const target = app({ currentStepOrder: 2 });

    await service.reject(target, 'actor-1', { comment: ' no ' });

    expect(approvalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ApplicationApprovalAction.REJECTED,
        comment: 'no',
        approvalStepId: 'step-2',
      }),
    );
    expect(target.status).toBe(ApplicationStatus.REJECTED);
    expect(target.currentStepOrder).toBeNull();
  });

  /**
   * 差し戻し対象がフォーム定義に存在しない場合に拒否すること
   */
  it('rejects return fields outside the form definition', async () => {
    correctionRequestsRepo.findOne.mockResolvedValue(null);
    templatesRepo.findOne.mockResolvedValue(
      template([{ id: 'field-title' } as FormField]),
    );

    await expectErrorCode(
      () =>
        service.returnForCorrection(app(), 'actor-1', {
          fields: [{ fieldId: 'field-other' }],
        }),
      ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID,
    );
  });

  /**
   * 差し戻し時に correction と対象 item を作成すること
   */
  it('records return action and creates correction items', async () => {
    const target = app();
    correctionRequestsRepo.findOne.mockResolvedValue(null);
    templatesRepo.findOne.mockResolvedValue(
      template([{ id: 'field-title', label: 'Title' } as FormField]),
    );

    const returnedTemplate = await service.returnForCorrection(
      target,
      'actor-1',
      {
        overallComment: ' fix ',
        fields: [{ fieldId: 'field-title', comment: ' title ' }],
      },
    );

    expect(returnedTemplate.id).toBe('template-1');
    expect(approvalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ApplicationApprovalAction.RETURNED,
        comment: 'fix',
      }),
    );
    expect(correctionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CorrectionRequestStatus.OPEN,
        overallComment: 'fix',
      }),
    );
    expect(correctionItemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        formFieldId: 'field-title',
        comment: 'title',
      }),
    );
    expect(target.status).toBe(ApplicationStatus.RETURNED);
  });
});
