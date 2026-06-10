import { ClientErrorCodes } from '../../../../common/errors';
import type { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';
import { ApplicationApprovalFlowResolver } from './application-approval-flow.resolver';

const flow = (overrides: Partial<ApprovalFlow> = {}): ApprovalFlow =>
  ({
    id: 'flow-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as ApprovalFlow;

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
 * ApplicationApprovalFlowResolver のテスト
 *
 * @group application-approval-flow-resolver
 */
describe('ApplicationApprovalFlowResolver', () => {
  let approvalFlowsRepository: {
    findActiveApprovalFlow: jest.Mock;
    listActiveApprovalFlows: jest.Mock;
  };
  let resolver: ApplicationApprovalFlowResolver;

  beforeEach(() => {
    approvalFlowsRepository = {
      findActiveApprovalFlow: jest.fn(),
      listActiveApprovalFlows: jest.fn(),
    };
    resolver = new ApplicationApprovalFlowResolver(
      approvalFlowsRepository as unknown as ApprovalFlowsRepository,
    );
  });

  /**
   * 指定された有効な承認フローを返すこと
   */
  it('resolves an explicitly selected active flow', async () => {
    const selected = flow({ id: 'flow-selected' });
    approvalFlowsRepository.findActiveApprovalFlow.mockResolvedValue(selected);

    await expect(
      resolver.resolveActiveFlow('tenant-1', 'group-1', 'flow-selected'),
    ).resolves.toBe(selected);
  });

  /**
   * 有効な承認フローが複数ある場合は明示指定を要求すること
   */
  it('rejects ambiguous active flows', async () => {
    approvalFlowsRepository.listActiveApprovalFlows.mockResolvedValue([
      flow({ id: 'flow-1' }),
      flow({ id: 'flow-2' }),
    ]);

    await expectErrorCode(
      () => resolver.resolveActiveFlow('tenant-1', 'group-1'),
      ClientErrorCodes.APPLICATION_APPROVAL_FLOW_AMBIGUOUS,
    );
  });

  /**
   * public 申請では作成順の最初の有効フローを返すこと
   */
  it('resolves the default active flow', async () => {
    const selected = flow({ id: 'flow-default' });
    approvalFlowsRepository.listActiveApprovalFlows.mockResolvedValue([
      selected,
    ]);

    await expect(
      resolver.resolveDefaultActiveFlow('tenant-1', 'group-1'),
    ).resolves.toBe(selected);
    expect(
      approvalFlowsRepository.listActiveApprovalFlows,
    ).toHaveBeenCalledWith(expect.objectContaining({ defaultOrder: true }));
  });
});
