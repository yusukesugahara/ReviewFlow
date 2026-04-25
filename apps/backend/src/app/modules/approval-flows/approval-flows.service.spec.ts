import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { UserRole } from '../../../models/constants/user-role';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../models/entities/approval-step.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { ApprovalFlowsService } from './approval-flows.service';

describe('ApprovalFlowsService', () => {
  let service: ApprovalFlowsService;
  let flows: jest.Mocked<
    Pick<Repository<ApprovalFlow>, 'find' | 'findOne' | 'manager'>
  >;
  let templates: jest.Mocked<Pick<Repository<FormTemplate>, 'findOne'>>;

  beforeEach(async () => {
    templates = {
      findOne: jest.fn(),
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
        { provide: getRepositoryToken(FormTemplate), useValue: templates },
      ],
    }).compile();

    service = module.get(ApprovalFlowsService);
  });

  it('create allows draft template so setup can define flow before publish', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      status: FormTemplateStatus.DRAFT,
    } as FormTemplate);
    flows.findOne.mockResolvedValue({
      id: 'flow-new',
      tenantId: 'ten1',
      formTemplateId: 't1',
      name: 'F',
      isActive: true,
      steps: [
        {
          id: 'step-1',
          stepOrder: 1,
          stepName: 'S1',
          approverRole: UserRole.APPROVER,
          canReturn: false,
        },
      ],
    } as ApprovalFlow);

    await expect(
      service.create('ten1', {
        formTemplateId: 't1',
        name: 'F',
        steps: [
          {
            stepOrder: 1,
            stepName: 'S1',
            approverRole: UserRole.APPROVER,
            canReturn: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'flow-new',
      formTemplateId: 't1',
    });
  });

  it('create rejects when step orders are not contiguous from 1', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      status: FormTemplateStatus.PUBLISHED,
    } as FormTemplate);

    await expect(
      service.create('ten1', {
        formTemplateId: 't1',
        name: 'F',
        steps: [
          {
            stepOrder: 1,
            stepName: 'S1',
            approverRole: UserRole.APPROVER,
            canReturn: false,
          },
          {
            stepOrder: 3,
            stepName: 'S2',
            approverRole: UserRole.TENANT_ADMIN,
            canReturn: true,
          },
        ],
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPROVAL_FLOW_STEPS_INVALID,
    });
  });
});
