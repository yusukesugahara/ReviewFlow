import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import type { ApplicationApproval } from '../../../../models/entities/application-approval.entity';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import type { User } from '../../../../models/entities/user.entity';
import type { ApplicationProgressRepository } from '../../../../models/repositories/application-progress.repository';
import { ApplicationProgressBuilder } from './application-progress.builder';
import { ApplicationProgressService } from './application-progress.service';

const step = (
  stepOrder: number,
  overrides: Partial<ApprovalStep> = {},
): ApprovalStep =>
  ({
    id: `step-${stepOrder}`,
    stepOrder,
    stepName: `Step ${stepOrder}`,
    assigneeUserId: `reviewer-${stepOrder}`,
    assigneeUserIds: [`reviewer-${stepOrder}`],
    canReturn: true,
    ...overrides,
  }) as ApprovalStep;

const flow = (steps: ApprovalStep[]): ApprovalFlow =>
  ({
    id: 'flow-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    name: 'Default flow',
    isActive: true,
    steps,
  }) as ApprovalFlow;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    currentStepOrder: 2,
    approvalFlow: flow([step(2), step(1)]),
    ...overrides,
  }) as Application;

const approval = (
  overrides: Partial<ApplicationApproval> = {},
): ApplicationApproval =>
  ({
    id: 'approval-1',
    tenantId: 'tenant-1',
    applicationId: 'app-1',
    approvalStepId: 'step-1',
    actedByUserId: 'reviewer-1',
    action: ApplicationApprovalAction.APPROVED,
    comment: 'ok',
    actedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as ApplicationApproval;

/**
 * ApplicationProgressService のテスト
 *
 * @group application-progress-service
 */
describe('ApplicationProgressService', () => {
  let progressRepository: {
    findApprovalsForProgress: jest.Mock;
    findUsersByIdsInTenant: jest.Mock;
  };
  let service: ApplicationProgressService;

  beforeEach(() => {
    progressRepository = {
      findApprovalsForProgress: jest.fn(),
      findUsersByIdsInTenant: jest.fn(),
    };
    service = new ApplicationProgressService(
      progressRepository as unknown as ApplicationProgressRepository,
      new ApplicationProgressBuilder(),
    );
  });

  it('hydrates approval progress with actions and assignee labels', async () => {
    const row = app();
    progressRepository.findApprovalsForProgress.mockResolvedValue([approval()]);
    progressRepository.findUsersByIdsInTenant.mockResolvedValue([
      {
        id: 'reviewer-1',
        email: 'reviewer-1@example.com',
        name: 'Reviewer One',
      },
      {
        id: 'reviewer-2',
        email: 'reviewer-2@example.com',
        name: 'Reviewer Two',
      },
    ] as User[]);

    const hydrated = await service.hydrate(row);

    expect(progressRepository.findApprovalsForProgress).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
    });
    expect(hydrated.approvalProgress).toEqual([
      expect.objectContaining({
        id: 'step-1',
        status: 'approved',
        assignees: [
          expect.objectContaining({
            email: 'reviewer-1@example.com',
          }),
        ],
        actions: [
          expect.objectContaining({
            action: ApplicationApprovalAction.APPROVED,
            actedAt: '2026-01-01T00:00:00.000Z',
          }),
        ],
      }),
      expect.objectContaining({
        id: 'step-2',
        status: 'current',
        assignees: [
          expect.objectContaining({
            email: 'reviewer-2@example.com',
          }),
        ],
      }),
    ]);
  });

  it('does not load progress data when approval flow has no steps', async () => {
    const row = app({ approvalFlow: flow([]) });

    const hydrated = await service.hydrate(row);

    expect(hydrated.approvalProgress).toEqual([]);
    expect(progressRepository.findApprovalsForProgress).not.toHaveBeenCalled();
  });
});
