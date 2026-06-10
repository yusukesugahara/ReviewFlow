import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { FormFieldType } from '../constants/form-field-type';
import { FormField } from '../entities/form-field.entity';
import { FormFieldsRepository } from './form-fields.repository';

describe('FormFieldsRepository', () => {
  let repository: FormFieldsRepository;
  let fields: jest.Mocked<
    Pick<
      Repository<FormField>,
      'find' | 'findOne' | 'create' | 'save' | 'remove'
    >
  >;

  beforeEach(async () => {
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
        FormFieldsRepository,
        { provide: getRepositoryToken(FormField), useValue: fields },
      ],
    }).compile();

    repository = module.get(FormFieldsRepository);
  });

  it('finds fields by key within a definition', async () => {
    fields.findOne.mockResolvedValue(null);

    await repository.findFieldByKey('definition-1', 'amount');

    expect(fields.findOne).toHaveBeenCalledWith({
      where: { formDefinitionId: 'definition-1', fieldKey: 'amount' },
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

  it('finds fields ordered for a definition', async () => {
    fields.find.mockResolvedValue([]);

    await repository.findFieldsOrdered('tenant-1', 'definition-1');

    expect(fields.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', formDefinitionId: 'definition-1' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  });

  it('finds fields by id within a definition', async () => {
    fields.findOne.mockResolvedValue(null);

    await repository.findFieldByIdInDefinition({
      tenantId: 'tenant-1',
      definitionId: 'definition-1',
      fieldId: 'field-1',
    });

    expect(fields.findOne).toHaveBeenCalledWith({
      where: {
        id: 'field-1',
        tenantId: 'tenant-1',
        formDefinitionId: 'definition-1',
      },
    });
  });
});
