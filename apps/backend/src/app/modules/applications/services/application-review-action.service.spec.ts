import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { Application } from '../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import { ApplicationReviewRepository } from '../../../../models/repositories/application-review.repository';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import { ApplicationReviewActionService } from './application-review-action.service';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

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
  let service: ApplicationReviewActionService;
  let applicationsRepository: {
    findOpenCorrection: jest.Mock;
    findTemplateByIdInGroup: jest.Mock;
  };
  let reviewRepository: {
    saveApproval: jest.Mock;
    saveReturnForCorrection: jest.Mock;
  };

  beforeEach(() => {
    applicationsRepository = {
      findOpenCorrection: jest.fn(),
      findTemplateByIdInGroup: jest.fn(),
    };
    reviewRepository = {
      saveApproval: jest.fn(),
      saveReturnForCorrection: jest.fn(),
    };
    service = new ApplicationReviewActionService(
      applicationsRepository as unknown as ApplicationsRepository,
      reviewRepository as unknown as ApplicationReviewRepository,
      new ApplicationTransitionPolicy(),
    );
  });

  /**
   * 中間ステップの承認を記録し次ステップへ進めること
   */
  it('records approval and advances to next step', async () => {
    const target = app();

    await service.approve(target, 'actor-1', { comment: ' ok ' });

    expect(reviewRepository.saveApproval).toHaveBeenCalledWith(
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

    expect(reviewRepository.saveApproval).toHaveBeenCalledWith(
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
    applicationsRepository.findOpenCorrection.mockResolvedValue(null);
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
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
    applicationsRepository.findOpenCorrection.mockResolvedValue(null);
    applicationsRepository.findTemplateByIdInGroup.mockResolvedValue(
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
    expect(reviewRepository.saveReturnForCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        overallComment: 'fix',
        fields: [
          expect.objectContaining({
            fieldId: 'field-title',
            comment: 'title',
          }),
        ],
      }),
    );
    expect(target.status).toBe(ApplicationStatus.RETURNED);
  });
});
