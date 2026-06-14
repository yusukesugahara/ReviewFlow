import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../../common/errors';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { FormDefinitionLifecycleService } from './form-definition-lifecycle.service';

describe('FormDefinitionLifecycleService', () => {
  let service: FormDefinitionLifecycleService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<FormDefinitionsRepository, 'findByIdWithFields' | 'saveDefinition'>
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
      findByIdWithFields: jest.fn(),
      saveDefinition: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionLifecycleService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(FormDefinitionLifecycleService);
  });

  it('publish rejects when definition is not draft', async () => {
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(
      definition({ status: FormDefinitionStatus.ARCHIVED }),
    );

    await expect(service.publish(actor, 't1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_PUBLISHABLE,
    });
    expect(spaceAccess.assertCanManageGroup).not.toHaveBeenCalled();
    expect(formDefinitionsRepository.saveDefinition).not.toHaveBeenCalled();
  });

  it('publish moves draft definition to published after management check', async () => {
    const row = definition({ status: FormDefinitionStatus.DRAFT });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);
    formDefinitionsRepository.saveDefinition.mockResolvedValue(row);

    const out = await service.publish(actor, 't1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(out.status).toBe(FormDefinitionStatus.PUBLISHED);
    expect(formDefinitionsRepository.saveDefinition).toHaveBeenCalledWith(row);
  });

  it('archive marks definition as archived after management check', async () => {
    const row = definition({ status: FormDefinitionStatus.PUBLISHED });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);
    formDefinitionsRepository.saveDefinition.mockResolvedValue(row);

    const out = await service.archive(actor, 't1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(out.status).toBe(FormDefinitionStatus.ARCHIVED);
    expect(out.archivedFromStatus).toBe(FormDefinitionStatus.PUBLISHED);
    expect(formDefinitionsRepository.saveDefinition).toHaveBeenCalledWith(row);
  });

  it('archive leaves already archived definitions unchanged', async () => {
    const row = definition({
      status: FormDefinitionStatus.ARCHIVED,
      archivedFromStatus: FormDefinitionStatus.DRAFT,
    });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);

    const out = await service.archive(actor, 't1');

    expect(out).toBe(row);
    expect(formDefinitionsRepository.saveDefinition).not.toHaveBeenCalled();
  });

  it('restore moves archived definition back to its previous status', async () => {
    const row = definition({
      status: FormDefinitionStatus.ARCHIVED,
      archivedFromStatus: FormDefinitionStatus.DRAFT,
    });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);
    formDefinitionsRepository.saveDefinition.mockResolvedValue(row);

    const out = await service.restore(actor, 't1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(out.status).toBe(FormDefinitionStatus.DRAFT);
    expect(out.archivedFromStatus).toBeNull();
    expect(formDefinitionsRepository.saveDefinition).toHaveBeenCalledWith(row);
  });

  it('restore leaves non-archived definitions unchanged', async () => {
    const row = definition({ status: FormDefinitionStatus.PUBLISHED });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);

    const out = await service.restore(actor, 't1');

    expect(out).toBe(row);
    expect(formDefinitionsRepository.saveDefinition).not.toHaveBeenCalled();
  });

  it('updateDescription trims non-empty text before saving', async () => {
    const row = definition({ description: 'old' });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);
    formDefinitionsRepository.saveDefinition.mockResolvedValue(row);

    const out = await service.updateDescription(actor, 't1', {
      description: '  new description  ',
    });

    expect(out.description).toBe('new description');
    expect(formDefinitionsRepository.saveDefinition).toHaveBeenCalledWith(row);
  });

  it('updateDescription stores null for blank text', async () => {
    const row = definition({ description: 'old' });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);
    formDefinitionsRepository.saveDefinition.mockResolvedValue(row);

    const out = await service.updateDescription(actor, 't1', {
      description: '   ',
    });

    expect(out.description).toBeNull();
    expect(formDefinitionsRepository.saveDefinition).toHaveBeenCalledWith(row);
  });
});

function definition(overrides: Partial<FormDefinition> = {}): FormDefinition {
  return {
    id: 't1',
    tenantId: 'ten1',
    groupId: 'g1',
    name: 'Expense Form',
    description: null,
    status: FormDefinitionStatus.DRAFT,
    archivedFromStatus: null,
    ...overrides,
  } as FormDefinition;
}
