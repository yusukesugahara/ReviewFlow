import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { FormTemplatesService } from './form-templates.service';

describe('FormTemplatesService', () => {
  let service: FormTemplatesService;
  let templates: jest.Mocked<
    Pick<Repository<FormTemplate>, 'find' | 'findOne' | 'create' | 'save'>
  >;
  let fields: jest.Mocked<
    Pick<Repository<FormField>, 'findOne' | 'create' | 'save'>
  >;

  beforeEach(async () => {
    templates = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn(async (x: FormTemplate) => x),
    } as unknown as jest.Mocked<
      Pick<Repository<FormTemplate>, 'find' | 'findOne' | 'create' | 'save'>
    >;
    fields = {
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn(async (x: FormField) => x),
    } as unknown as jest.Mocked<
      Pick<Repository<FormField>, 'findOne' | 'create' | 'save'>
    >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormTemplatesService,
        { provide: getRepositoryToken(FormTemplate), useValue: templates },
        { provide: getRepositoryToken(FormField), useValue: fields },
      ],
    }).compile();

    service = module.get(FormTemplatesService);
  });

  it('create saves draft template', async () => {
    const saved = {
      id: 't1',
      tenantId: 'ten1',
      name: 'A',
      description: null,
      status: FormTemplateStatus.DRAFT,
      createdByUserId: 'u1',
    } as FormTemplate;
    templates.save.mockResolvedValue(saved);

    const out = await service.create('ten1', { name: '  A  ' }, 'u1');

    expect(templates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A',
        status: FormTemplateStatus.DRAFT,
        createdByUserId: 'u1',
      }),
    );
    expect(out.id).toBe('t1');
  });

  it('addField rejects when template not draft', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      status: FormTemplateStatus.PUBLISHED,
    } as FormTemplate);

    await expect(
      service.addField('ten1', 't1', {
        fieldKey: 'k',
        label: 'L',
        fieldType: FormFieldType.TEXT,
        required: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ errorCode: ClientErrorCodes.FORM_TEMPLATE_IMMUTABLE });
  });

  it('publish rejects when not draft', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      status: FormTemplateStatus.ARCHIVED,
    } as FormTemplate);

    await expect(service.publish('ten1', 't1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_TEMPLATE_NOT_PUBLISHABLE,
    });
  });
});
