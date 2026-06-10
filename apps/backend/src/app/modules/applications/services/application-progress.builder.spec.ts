import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import type { ApplicationApproval } from '../../../../models/entities/application-approval.entity';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import type { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import type { User } from '../../../../models/entities/user.entity';
import { ApplicationProgressBuilder } from './application-progress.builder';

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

const user = (overrides: Partial<User> = {}): User =>
  ({
    id: 'reviewer-1',
    email: 'reviewer-1@example.com',
    name: 'Reviewer One',
    ...overrides,
  }) as User;

describe('ApplicationProgressBuilder', () => {
  let builder: ApplicationProgressBuilder;

  beforeEach(() => {
    builder = new ApplicationProgressBuilder();
  });

  it('sorts approval steps by step order', () => {
    expect(builder.getOrderedSteps(app()).map((row) => row.id)).toEqual([
      'step-1',
      'step-2',
    ]);
  });

  it('collects assignee and approval actor ids', () => {
    expect(
      builder.collectUserIds(app(), [
        approval({ actedByUserId: 'reviewer-3' }),
      ]),
    ).toEqual(['reviewer-1', 'reviewer-2', 'reviewer-3']);
  });

  it('builds progress rows with approval status and user labels', () => {
    const progress = builder.build(
      app(),
      [approval()],
      [
        user(),
        user({
          id: 'reviewer-2',
          email: 'reviewer-2@example.com',
          name: 'Reviewer Two',
        }),
      ],
    );

    expect(progress).toEqual([
      expect.objectContaining({
        id: 'step-1',
        status: 'approved',
        assignees: [
          expect.objectContaining({ email: 'reviewer-1@example.com' }),
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
          expect.objectContaining({ email: 'reviewer-2@example.com' }),
        ],
      }),
    ]);
  });

  it('uses the latest approval action to determine returned status', () => {
    const progress = builder.build(
      app(),
      [
        approval(),
        approval({
          id: 'approval-2',
          action: ApplicationApprovalAction.RETURNED,
        }),
      ],
      [],
    );

    expect(progress[0].status).toBe('returned');
  });
});
