import { Test, TestingModule } from '@nestjs/testing';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { FormDefinitionCreationService } from './form-definition-creation.service';

describe('FormDefinitionCreationService', () => {
  let service: FormDefinitionCreationService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<FormDefinitionsRepository, 'createDefinition'>
  >;
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertCanManageGroup'>
  >;

  const actor = {
    id: 'u1',
    tenantId: 'ten1',
    email: 'u1@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    formDefinitionsRepository = {
      createDefinition: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionCreationService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(FormDefinitionCreationService);
  });

  it('creates a draft definition after management check', async () => {
    const saved = formDefinition({ name: 'Expense Form' });
    formDefinitionsRepository.createDefinition.mockResolvedValue(saved);

    const out = await service.create(actor, {
      groupId: 'g1',
      name: '  Expense Form  ',
      description: '  Expense workflow  ',
    });

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(formDefinitionsRepository.createDefinition).toHaveBeenCalledWith({
      tenantId: 'ten1',
      groupId: 'g1',
      name: 'Expense Form',
      description: 'Expense workflow',
      createdByUserId: 'u1',
    });
    expect(out).toBe(saved);
  });

  it('stores null when description is blank', async () => {
    const saved = formDefinition();
    formDefinitionsRepository.createDefinition.mockResolvedValue(saved);

    await service.create(actor, {
      groupId: 'g1',
      name: 'Form',
      description: '   ',
    });

    expect(formDefinitionsRepository.createDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      }),
    );
  });
});

function formDefinition(
  overrides: Partial<FormDefinition> = {},
): FormDefinition {
  return {
    id: 't1',
    tenantId: 'ten1',
    groupId: 'g1',
    name: 'Form',
    description: null,
    status: FormDefinitionStatus.DRAFT,
    createdByUserId: 'u1',
    ...overrides,
  } as FormDefinition;
}
