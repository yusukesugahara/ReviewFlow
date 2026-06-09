import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { GroupMember } from '../../../../models/entities/group-member.entity';
import { User } from '../../../../models/entities/user.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { ApprovalFlowsService } from './approval-flows.service';

/**
 * ApprovalFlowsService のテスト
 *
 * @group approval-flows-service
 */
describe('ApprovalFlowsService', () => {
  let service: ApprovalFlowsService;
  let approvalFlowsRepository: jest.Mocked<
    Pick<
      ApprovalFlowsRepository,
      | 'findAssignees'
      | 'findAssigneeMemberships'
      | 'createFlowWithSteps'
      | 'replaceFlowSteps'
      | 'findOneById'
    >
  >;
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertCanManageGroup'>
  >;
  const actor = {
    id: 'admin-1',
    tenantId: 'ten1',
    email: 'admin@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    approvalFlowsRepository = {
      findAssignees: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      findAssigneeMemberships: jest
        .fn()
        .mockResolvedValue([{ userId: 'user-1' }]),
      createFlowWithSteps: jest.fn().mockResolvedValue('flow-new'),
      replaceFlowSteps: jest.fn().mockResolvedValue(undefined),
      findOneById: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalFlowsService,
        {
          provide: ApprovalFlowsRepository,
          useValue: approvalFlowsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(ApprovalFlowsService);
  });

  /**
   * create はグループスコープの承認フローを保存すること
   */
  it('create stores a group-scoped approval flow', async () => {
    approvalFlowsRepository.findOneById.mockResolvedValue({
      id: 'flow-new',
      tenantId: 'ten1',
      groupId: 'g1',
      name: 'F',
      isActive: true,
      steps: [
        {
          id: 'step-1',
          stepOrder: 1,
          stepName: 'S1',
          assigneeUserId: 'user-1',
          canReturn: false,
        },
      ],
    } as ApprovalFlow);

    await expect(
      service.create(actor, {
        groupId: 'g1',
        name: 'F',
        steps: [
          {
            stepOrder: 1,
            stepName: 'S1',
            assigneeUserId: 'user-1',
            canReturn: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'flow-new',
      groupId: 'g1',
    });
  });

  /**
   * create は単一の承認ステップに複数の担当者を設定できること
   */
  it('create accepts multiple assignees for a single approval step', async () => {
    approvalFlowsRepository.findAssignees.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ] as User[]);
    approvalFlowsRepository.findAssigneeMemberships.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ] as GroupMember[]);
    approvalFlowsRepository.findOneById.mockResolvedValue({
      id: 'flow-new',
      tenantId: 'ten1',
      groupId: 'g1',
      name: 'F',
      isActive: true,
      steps: [
        {
          id: 'step-1',
          stepOrder: 1,
          stepName: 'S1',
          assigneeUserId: 'user-1',
          assigneeUserIds: ['user-1', 'user-2'],
          canReturn: false,
        },
      ],
    } as ApprovalFlow);

    await expect(
      service.create(actor, {
        groupId: 'g1',
        name: 'F',
        steps: [
          {
            stepOrder: 1,
            stepName: 'S1',
            assigneeUserId: 'user-1',
            assigneeUserIds: ['user-1', 'user-2'],
            canReturn: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      steps: [
        {
          assigneeUserIds: ['user-1', 'user-2'],
        },
      ],
    });
  });

  /**
   * update は既存の承認フローのステップを置き換えること
   */
  it('update replaces steps on an existing approval flow', async () => {
    approvalFlowsRepository.findAssignees.mockResolvedValue([
      { id: 'user-1' },
    ] as User[]);
    approvalFlowsRepository.findAssigneeMemberships.mockResolvedValue([
      { userId: 'user-1' },
    ] as GroupMember[]);
    approvalFlowsRepository.findOneById
      .mockResolvedValueOnce({
        id: 'flow-1',
        tenantId: 'ten1',
        groupId: 'g1',
        name: 'Before',
        isActive: true,
        steps: [],
      } as unknown as ApprovalFlow)
      .mockResolvedValueOnce({
        id: 'flow-1',
        tenantId: 'ten1',
        groupId: 'g1',
        name: 'After',
        isActive: true,
        steps: [
          {
            id: 'step-next',
            stepOrder: 1,
            stepName: '更新後承認',
            assigneeUserId: 'user-1',
            assigneeUserIds: ['user-1'],
            canReturn: true,
          },
        ],
      } as ApprovalFlow);

    await expect(
      service.update(actor, 'flow-1', {
        name: 'After',
        steps: [
          {
            stepOrder: 1,
            stepName: '更新後承認',
            assigneeUserId: 'user-1',
            canReturn: true,
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'flow-1',
      name: 'After',
    });

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(approvalFlowsRepository.createFlowWithSteps).not.toHaveBeenCalled();
    expect(approvalFlowsRepository.replaceFlowSteps).toHaveBeenCalledWith({
      tenantId: 'ten1',
      flowId: 'flow-1',
      name: 'After',
      steps: [
        {
          stepOrder: 1,
          stepName: '更新後承認',
          assigneeUserIds: ['user-1'],
          canReturn: true,
        },
      ],
    });
  });

  /**
   * create はステップ順序が連続していない場合にエラーを返すこと
   */
  it('create rejects when step orders are not contiguous from 1', async () => {
    await expect(
      service.create(actor, {
        groupId: 'g1',
        name: 'F',
        steps: [
          {
            stepOrder: 1,
            stepName: 'S1',
            assigneeUserId: 'user-1',
            canReturn: false,
          },
          {
            stepOrder: 3,
            stepName: 'S2',
            assigneeUserId: 'user-1',
            canReturn: true,
          },
        ],
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID,
    });
  });
});
