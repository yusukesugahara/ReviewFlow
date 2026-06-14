import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { In, Repository } from 'typeorm';
import { ApprovalFlow } from '../entities/approval-flow.entity';
import { ApprovalStep } from '../entities/approval-step.entity';
import { GroupMember } from '../entities/group-member.entity';
import { User } from '../entities/user.entity';
import { ApprovalFlowsRepository } from './approval-flows.repository';

describe('ApprovalFlowsRepository', () => {
  let repository: ApprovalFlowsRepository;
  let flows: jest.Mocked<
    Pick<Repository<ApprovalFlow>, 'find' | 'findOne' | 'manager'>
  >;
  let members: jest.Mocked<Pick<Repository<GroupMember>, 'count'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'count'>>;
  let txFlowRepo: { create: jest.Mock; save: jest.Mock };
  let txStepRepo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    txFlowRepo = {
      create: jest.fn((row: Partial<ApprovalFlow>) => row as ApprovalFlow),
      save: jest.fn((row: ApprovalFlow) =>
        Promise.resolve({ ...row, id: 'flow-1' }),
      ),
    };
    txStepRepo = {
      create: jest.fn((row: Partial<ApprovalStep>) => row as ApprovalStep),
      save: jest.fn((row: ApprovalStep) => Promise.resolve(row)),
    };
    flows = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
          await fn({
            getRepository: (entity: unknown) =>
              entity === ApprovalFlow ? txFlowRepo : txStepRepo,
          });
        }),
      } as unknown as Repository<ApprovalFlow>['manager'],
    };
    members = {
      count: jest.fn(),
    };
    users = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalFlowsRepository,
        { provide: getRepositoryToken(ApprovalFlow), useValue: flows },
        { provide: getRepositoryToken(GroupMember), useValue: members },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    repository = module.get(ApprovalFlowsRepository);
  });

  it('lists group flows and sorts steps by stepOrder', async () => {
    flows.find.mockResolvedValue([
      {
        id: 'flow-1',
        steps: [
          { id: 'step-2', stepOrder: 2 },
          { id: 'step-1', stepOrder: 1 },
        ],
      } as ApprovalFlow,
    ]);

    const rows = await repository.listByGroup('tenant-1', 'group-1');

    expect(flows.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', groupId: 'group-1' },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
    expect(rows[0].steps.map((step) => step.stepOrder)).toEqual([1, 2]);
  });

  it('counts assignees in the tenant', async () => {
    users.count.mockResolvedValue(2);

    await expect(
      repository.countAssigneesInTenant('tenant-1', ['user-1', 'user-2']),
    ).resolves.toBe(2);

    expect(users.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: In(['user-1', 'user-2']) },
    });
  });

  it('counts assignee memberships in the group', async () => {
    members.count.mockResolvedValue(2);

    await expect(
      repository.countAssigneeMemberships({
        tenantId: 'tenant-1',
        groupId: 'group-1',
        assigneeIds: ['user-1', 'user-2'],
      }),
    ).resolves.toBe(2);

    expect(members.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        groupId: 'group-1',
        userId: In(['user-1', 'user-2']),
      },
    });
  });

  it('finds an active flow by tenant, group, and id', async () => {
    flows.findOne.mockResolvedValue({
      id: 'flow-1',
      steps: [
        { id: 'step-2', stepOrder: 2 },
        { id: 'step-1', stepOrder: 1 },
      ],
    } as ApprovalFlow);

    const row = await repository.findActiveApprovalFlow({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      approvalFlowId: 'flow-1',
    });

    expect(flows.findOne).toHaveBeenCalledWith({
      where: {
        id: 'flow-1',
        tenantId: 'tenant-1',
        groupId: 'group-1',
        isActive: true,
      },
      relations: ['steps'],
    });
    expect(row?.steps.map((step) => step.stepOrder)).toEqual([1, 2]);
  });

  it('lists active flows for application resolution with default ordering', async () => {
    flows.find.mockResolvedValue([]);

    await repository.listActiveApprovalFlows({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      defaultOrder: true,
    });

    expect(flows.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        groupId: 'group-1',
        isActive: true,
      },
      relations: ['steps'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  });

  it('creates a flow and steps in one transaction', async () => {
    const flowId = await repository.createFlowWithSteps({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      name: 'Expense flow',
      steps: [
        {
          stepOrder: 1,
          stepName: 'Manager',
          assigneeUserIds: ['user-1', 'user-2'],
          canReturn: true,
        },
      ],
    });

    expect(flowId).toBe('flow-1');
    const manager = flows.manager as unknown as { transaction: jest.Mock };
    expect(manager.transaction).toHaveBeenCalled();
    expect(txFlowRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      name: 'Expense flow',
      isActive: true,
    });
    expect(txStepRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      approvalFlowId: 'flow-1',
      stepOrder: 1,
      stepName: 'Manager',
      assigneeUserId: 'user-1',
      assigneeUserIds: ['user-1', 'user-2'],
      canReturn: true,
    });
  });
});
