import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { ApprovalFlow } from '../../../../models/entities/approval-flow.entity';
import { ApprovalFlowsRepository } from '../../../../models/repositories/approval-flows.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import { SpaceAccessService } from '../../groups/services/access/space-access.service';
import { ApprovalFlowMutationService } from './approval-flow-mutation.service';
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
      'listByGroup' | 'findOneById' | 'listActiveForApplicant'
    >
  >;
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertCanManageGroup'>
  >;
  let approvalFlowMutation: jest.Mocked<
    Pick<ApprovalFlowMutationService, 'create' | 'update'>
  >;
  const actor = {
    id: 'admin-1',
    tenantId: 'ten1',
    email: 'admin@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    approvalFlowsRepository = {
      listByGroup: jest.fn(),
      findOneById: jest.fn(),
      listActiveForApplicant: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };
    approvalFlowMutation = {
      create: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalFlowsService,
        {
          provide: ApprovalFlowsRepository,
          useValue: approvalFlowsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
        {
          provide: ApprovalFlowMutationService,
          useValue: approvalFlowMutation,
        },
      ],
    }).compile();

    service = module.get(ApprovalFlowsService);
  });

  it('listByGroup checks management access and scopes by tenant and group', async () => {
    const rows = [approvalFlow()];
    approvalFlowsRepository.listByGroup.mockResolvedValue(rows);

    const out = await service.listByGroup(actor, 'g1');

    expect(out).toBe(rows);
    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(approvalFlowsRepository.listByGroup).toHaveBeenCalledWith(
      'ten1',
      'g1',
    );
  });

  it('create delegates mutation service', async () => {
    const created = approvalFlow({ id: 'flow-new' });
    const dto = {
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
    };
    approvalFlowMutation.create.mockResolvedValue(created);

    const out = await service.create(actor, dto);

    expect(out).toBe(created);
    expect(approvalFlowMutation.create).toHaveBeenCalledWith(actor, dto);
  });

  it('update delegates mutation service', async () => {
    const updated = approvalFlow({ id: 'flow-1', name: 'After' });
    const dto = {
      name: 'After',
      steps: [
        {
          stepOrder: 1,
          stepName: 'S1',
          assigneeUserId: 'user-1',
          canReturn: true,
        },
      ],
    };
    approvalFlowMutation.update.mockResolvedValue(updated);

    const out = await service.update(actor, 'flow-1', dto);

    expect(out).toBe(updated);
    expect(approvalFlowMutation.update).toHaveBeenCalledWith(
      actor,
      'flow-1',
      dto,
    );
  });

  it('getOne rejects when the flow is not found in tenant scope', async () => {
    approvalFlowsRepository.findOneById.mockResolvedValue(null);

    await expect(service.getOne('ten1', 'missing')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPROVAL_FLOW_NOT_FOUND,
    });
  });

  it('listActiveForApplicant scopes active flows by applicant token', async () => {
    const rows = [approvalFlow()];
    const applicant = {
      kind: 'applicant_access',
      tenantId: 'ten1',
      email: 'applicant@example.com',
      groupId: 'g1',
      formDefinitionId: 'form-1',
    } satisfies ApplicantAccessTokenPayload;
    approvalFlowsRepository.listActiveForApplicant.mockResolvedValue(rows);

    const out = await service.listActiveForApplicant(applicant);

    expect(out).toBe(rows);
    expect(approvalFlowsRepository.listActiveForApplicant).toHaveBeenCalledWith(
      {
        tenantId: 'ten1',
        groupId: 'g1',
      },
    );
  });
});

function approvalFlow(overrides: Partial<ApprovalFlow> = {}): ApprovalFlow {
  return {
    id: 'flow-1',
    tenantId: 'ten1',
    groupId: 'g1',
    name: 'F',
    isActive: true,
    steps: [],
    ...overrides,
  } as ApprovalFlow;
}
