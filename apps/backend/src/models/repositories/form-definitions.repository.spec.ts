import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Not, Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { FormDefinition } from '../entities/form-definition.entity';
import { FormDefinitionsRepository } from './form-definitions.repository';

describe('FormDefinitionsRepository', () => {
  let repository: FormDefinitionsRepository;
  let definitions: jest.Mocked<
    Pick<Repository<FormDefinition>, 'find' | 'findOne' | 'create' | 'save'>
  >;

  beforeEach(async () => {
    definitions = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((row: Partial<FormDefinition>) => row as FormDefinition),
      save: jest.fn((row: FormDefinition) => Promise.resolve(row)),
    } as unknown as jest.Mocked<
      Pick<Repository<FormDefinition>, 'find' | 'findOne' | 'create' | 'save'>
    >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionsRepository,
        { provide: getRepositoryToken(FormDefinition), useValue: definitions },
      ],
    }).compile();

    repository = module.get(FormDefinitionsRepository);
  });

  it('lists non archived definitions by default', async () => {
    definitions.find.mockResolvedValue([]);

    await repository.listByGroup({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      includeArchived: false,
    });

    expect(definitions.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        groupId: 'group-1',
        status: Not(FormDefinitionStatus.ARCHIVED),
      },
      relations: ['fields'],
      order: { updatedAt: 'DESC', fields: { sortOrder: 'ASC' } },
    });
  });

  it('creates draft definitions', async () => {
    await repository.createDefinition({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      name: 'Expense',
      description: null,
      createdByUserId: 'user-1',
    });

    expect(definitions.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      name: 'Expense',
      description: null,
      status: FormDefinitionStatus.DRAFT,
      createdByUserId: 'user-1',
    });
  });

  it('finds a template by id within the group', async () => {
    definitions.findOne.mockResolvedValue(null);

    await repository.findTemplateByIdInGroup({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
      onlyPublished: true,
    });

    expect(definitions.findOne).toHaveBeenCalledWith({
      where: {
        id: 'form-1',
        tenantId: 'tenant-1',
        groupId: 'group-1',
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  });

  it('finds published templates for application creation', async () => {
    definitions.find.mockResolvedValue([]);

    await repository.findPublishedTemplatesForApplicationCreation({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
    });

    expect(definitions.find).toHaveBeenCalledWith({
      where: {
        id: 'form-1',
        tenantId: 'tenant-1',
        groupId: 'group-1',
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  });
});
