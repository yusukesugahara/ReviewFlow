import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../../common/errors';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../../models/entities/approval-step.entity';
import { GroupMember } from '../../../../models/entities/group-member.entity';
import { User } from '../../../../models/entities/user.entity';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { ApprovalFlowsService } from './approval-flows.service';

/**
 * ApprovalFlowsService のテスト
 *
 * @group approval-flows-service
 */
describe('ApprovalFlowsService', () => {
  let service: ApprovalFlowsService;
  let flows: jest.Mocked<
    Pick<Repository<ApprovalFlow>, 'find' | 'findOne' | 'manager'>
  >;
  let members: jest.Mocked<Pick<Repository<GroupMember>, 'findOne' | 'find'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'find'>>;
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
    users = {
      find: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    };
    members = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };
    flows = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
          const flowRepo = {
            create: jest.fn((x: object) => ({ ...x, id: 'flow-new' })),
            save: jest.fn((x: ApprovalFlow & { id?: string }) => ({
              ...x,
              id: x.id ?? 'flow-new',
            })),
          };
          const stepRepo = {
            create: jest.fn((x: object) => ({ ...x })),
            save: jest.fn((x: unknown) => x),
          };
          await fn({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalFlow) {
                return flowRepo;
              }
              if (entity === ApprovalStep) {
                return stepRepo;
              }
              throw new Error('unexpected entity in transaction mock');
            },
          });
        }),
      } as unknown as Repository<ApprovalFlow>['manager'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalFlowsService,
        { provide: getRepositoryToken(ApprovalFlow), useValue: flows },
        { provide: getRepositoryToken(GroupMember), useValue: members },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(ApprovalFlowsService);
  });

  /**
   * create はグループスコープの承認フローを保存すること
   */
  it('create stores a group-scoped approval flow', async () => {
    flows.findOne.mockResolvedValue({
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
    users.find.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ] as User[]);
    members.find.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ] as GroupMember[]);
    flows.findOne.mockResolvedValue({
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
