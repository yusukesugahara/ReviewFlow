import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { FormDefinitionQueryService } from './form-definition-query.service';

describe('FormDefinitionQueryService', () => {
  let service: FormDefinitionQueryService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<
      FormDefinitionsRepository,
      'listByGroup' | 'findOneByGroup' | 'findByIdWithFields'
    >
  >;
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertCanManageGroup' | 'assertCanUseGroup'>
  >;

  const actor = {
    id: 'u1',
    tenantId: 'ten1',
    email: 'u1@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    formDefinitionsRepository = {
      listByGroup: jest.fn(),
      findOneByGroup: jest.fn(),
      findByIdWithFields: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
      assertCanUseGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionQueryService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(FormDefinitionQueryService);
  });

  it('listByGroup checks management access and scopes by tenant and group', async () => {
    const rows = [formDefinition()];
    formDefinitionsRepository.listByGroup.mockResolvedValue(rows);

    const out = await service.listByGroup(actor, 'g1', true);

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(formDefinitionsRepository.listByGroup).toHaveBeenCalledWith({
      tenantId: 'ten1',
      groupId: 'g1',
      includeArchived: true,
    });
    expect(out).toBe(rows);
  });

  it('getOneByGroupForActor checks management access and returns the group definition', async () => {
    const row = formDefinition();
    formDefinitionsRepository.findOneByGroup.mockResolvedValue(row);

    const out = await service.getOneByGroupForActor(actor, 'g1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(formDefinitionsRepository.findOneByGroup).toHaveBeenCalledWith({
      tenantId: 'ten1',
      groupId: 'g1',
    });
    expect(out).toBe(row);
  });

  it('getOneByGroupForActor rejects when definition is not found', async () => {
    formDefinitionsRepository.findOneByGroup.mockResolvedValue(null);

    await expect(
      service.getOneByGroupForActor(actor, 'g1'),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    });
  });

  it('getOne returns a tenant-scoped definition', async () => {
    const row = formDefinition();
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);

    const out = await service.getOne('ten1', 't1');

    expect(formDefinitionsRepository.findByIdWithFields).toHaveBeenCalledWith(
      'ten1',
      't1',
    );
    expect(out).toBe(row);
  });

  it('getOne rejects when definition is not found in the tenant scope', async () => {
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(null);

    await expect(service.getOne('ten1', 'missing')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    });
  });

  it('getOneForActor checks space usage access only', async () => {
    const row = formDefinition({ groupId: 'g1' });
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(row);

    const out = await service.getOneForActor(actor, 't1');

    expect(out).toBe(row);
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(spaceAccess.assertCanManageGroup).not.toHaveBeenCalled();
  });
});

function formDefinition(
  overrides: Partial<FormDefinition> = {},
): FormDefinition {
  return {
    id: 't1',
    tenantId: 'ten1',
    groupId: 'g1',
    name: 'Expense Form',
    description: null,
    status: FormDefinitionStatus.PUBLISHED,
    createdByUserId: 'u1',
    ...overrides,
  } as FormDefinition;
}
