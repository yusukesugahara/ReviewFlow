import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Not, Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { FormFieldType } from '../constants/form-field-type';
import { FormDefinition } from '../entities/form-definition.entity';
import { FormField } from '../entities/form-field.entity';
import { FormDefinitionsRepository } from './form-definitions.repository';

describe('FormDefinitionsRepository', () => {
  let repository: FormDefinitionsRepository;
  let definitions: jest.Mocked<
    Pick<Repository<FormDefinition>, 'find' | 'findOne' | 'create' | 'save'>
  >;
  let fields: jest.Mocked<
    Pick<
      Repository<FormField>,
      'find' | 'findOne' | 'create' | 'save' | 'remove'
    >
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
    fields = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((row: Partial<FormField>) => row as FormField),
      save: jest.fn((row: FormField | FormField[]) => Promise.resolve(row)),
      remove: jest.fn((row: FormField) => Promise.resolve(row)),
    } as unknown as jest.Mocked<
      Pick<
        Repository<FormField>,
        'find' | 'findOne' | 'create' | 'save' | 'remove'
      >
    >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionsRepository,
        { provide: getRepositoryToken(FormDefinition), useValue: definitions },
        { provide: getRepositoryToken(FormField), useValue: fields },
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

  it('creates fields with normalized params supplied by service', async () => {
    await repository.createField({
      tenantId: 'tenant-1',
      formDefinitionId: 'definition-1',
      fieldKey: 'amount',
      label: 'Amount',
      fieldType: FormFieldType.NUMBER,
      required: true,
      placeholder: null,
      helpText: null,
      optionsJson: null,
      sortOrder: 0,
    });

    expect(fields.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      formDefinitionId: 'definition-1',
      fieldKey: 'amount',
      label: 'Amount',
      fieldType: FormFieldType.NUMBER,
      required: true,
      placeholder: null,
      helpText: null,
      optionsJson: null,
      sortOrder: 0,
    });
  });
});
