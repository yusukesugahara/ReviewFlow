import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../../common/errors';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../../models/constants/form-field-type';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormField } from '../../../../../models/entities/form-field.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { FormFieldsRepository } from '../../../../../models/repositories/form-fields.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { FormDefinitionFieldsService } from './form-definition-fields.service';

describe('FormDefinitionFieldsService', () => {
  let service: FormDefinitionFieldsService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<FormDefinitionsRepository, 'findByIdWithFieldsInTenant'>
  >;
  let formFieldsRepository: jest.Mocked<
    Pick<
      FormFieldsRepository,
      | 'findFieldByKey'
      | 'createField'
      | 'findFieldsOrdered'
      | 'saveFields'
      | 'findFieldByIdInDefinition'
      | 'removeField'
      | 'saveField'
    >
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
      findByIdWithFieldsInTenant: jest.fn(),
    };
    formFieldsRepository = {
      findFieldByKey: jest.fn(),
      createField: jest.fn(),
      findFieldsOrdered: jest.fn(),
      saveFields: jest.fn(),
      findFieldByIdInDefinition: jest.fn(),
      removeField: jest.fn(),
      saveField: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionFieldsService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        {
          provide: FormFieldsRepository,
          useValue: formFieldsRepository,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
      ],
    }).compile();

    service = module.get(FormDefinitionFieldsService);
  });

  it('addField rejects when definition is not draft', async () => {
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition({ status: FormDefinitionStatus.PUBLISHED }),
    );

    await expect(
      service.addField(actor, 't1', {
        fieldKey: 'title',
        label: 'Title',
        fieldType: FormFieldType.TEXT,
        required: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_IMMUTABLE,
    });
    expect(spaceAccess.assertCanManageGroup).not.toHaveBeenCalled();
  });

  it('addField trims values and creates a field after management check', async () => {
    const saved = field('field1', 2);
    const options = [{ label: 'A', value: 'a' }];
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition(),
    );
    formFieldsRepository.findFieldByKey.mockResolvedValue(null);
    formFieldsRepository.createField.mockResolvedValue(saved);

    const out = await service.addField(actor, 't1', {
      fieldKey: ' title ',
      label: ' Title ',
      fieldType: FormFieldType.SELECT,
      required: true,
      placeholder: ' Select one ',
      helpText: ' Help ',
      options,
      sortOrder: 2,
    });

    expect(out).toBe(saved);
    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(formFieldsRepository.findFieldByKey).toHaveBeenCalledWith(
      't1',
      'title',
    );
    expect(formFieldsRepository.createField).toHaveBeenCalledWith({
      tenantId: 'ten1',
      formDefinitionId: 't1',
      fieldKey: 'title',
      label: 'Title',
      fieldType: FormFieldType.SELECT,
      required: true,
      placeholder: 'Select one',
      helpText: 'Help',
      optionsJson: options,
      sortOrder: 2,
    });
  });

  it('addField rejects duplicate field keys', async () => {
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition(),
    );
    formFieldsRepository.findFieldByKey.mockResolvedValue(field('field1', 0));

    await expect(
      service.addField(actor, 't1', {
        fieldKey: 'title',
        label: 'Title',
        fieldType: FormFieldType.TEXT,
        required: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_FIELD_KEY_EXISTS,
    });
    expect(formFieldsRepository.createField).not.toHaveBeenCalled();
  });

  it('moveField reorders fields and normalizes sort order', async () => {
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition(),
    );
    formFieldsRepository.findFieldsOrdered.mockResolvedValue([
      field('a', 10),
      field('b', 20),
      field('c', 30),
    ]);

    await service.moveField(actor, 't1', 'c', 'up');

    const savedRows = formFieldsRepository.saveFields.mock.calls[0]?.[0] ?? [];
    expect(savedRows.map((row) => row.id)).toEqual(['a', 'c', 'b']);
    expect(savedRows.map((row) => row.sortOrder)).toEqual([0, 1, 2]);
  });

  it('deleteField removes the target and normalizes remaining fields', async () => {
    const target = field('b', 20);
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition(),
    );
    formFieldsRepository.findFieldByIdInDefinition.mockResolvedValue(target);
    formFieldsRepository.findFieldsOrdered.mockResolvedValue([
      field('a', 10),
      field('c', 30),
    ]);

    await service.deleteField(actor, 't1', 'b');

    expect(formFieldsRepository.removeField).toHaveBeenCalledWith(target);
    const savedRows = formFieldsRepository.saveFields.mock.calls[0]?.[0] ?? [];
    expect(savedRows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(savedRows.map((row) => row.sortOrder)).toEqual([0, 1]);
  });

  it('updateFieldSettings trims optional text values before saving', async () => {
    const target = field('a', 0, {
      label: 'Old',
      fieldType: FormFieldType.TEXT,
      required: false,
      placeholder: 'old',
      helpText: 'old',
      optionsJson: [{ label: 'old' }],
    });
    const options = [{ label: 'A', value: 'a' }];
    formDefinitionsRepository.findByIdWithFieldsInTenant.mockResolvedValue(
      definition(),
    );
    formFieldsRepository.findFieldByIdInDefinition.mockResolvedValue(target);
    formFieldsRepository.saveField.mockResolvedValue(target);

    await service.updateFieldSettings(actor, 't1', 'a', {
      label: ' New ',
      fieldType: FormFieldType.SELECT,
      required: true,
      placeholder: ' ',
      helpText: ' Help ',
      options,
    });

    expect(formFieldsRepository.saveField).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'New',
        fieldType: FormFieldType.SELECT,
        required: true,
        placeholder: null,
        helpText: 'Help',
        optionsJson: options,
      }),
    );
  });
});

function definition(overrides: Partial<FormDefinition> = {}): FormDefinition {
  return {
    id: 't1',
    tenantId: 'ten1',
    groupId: 'g1',
    status: FormDefinitionStatus.DRAFT,
    ...overrides,
  } as FormDefinition;
}

function field(
  id: string,
  sortOrder: number,
  overrides: Partial<FormField> = {},
): FormField {
  return {
    id,
    tenantId: 'ten1',
    formDefinitionId: 't1',
    fieldKey: id,
    label: id,
    fieldType: FormFieldType.TEXT,
    required: false,
    placeholder: null,
    helpText: null,
    optionsJson: null,
    sortOrder,
    ...overrides,
  } as FormField;
}
