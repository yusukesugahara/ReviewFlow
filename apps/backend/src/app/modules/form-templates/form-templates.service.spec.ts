import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { AuthService } from '../auth/auth.service';
import { SpaceAccessService } from '../groups/space-access.service';
import { MailService } from '../mail/mail.service';
import { FormTemplatesService } from './form-templates.service';

describe('FormTemplatesService', () => {
  let service: FormTemplatesService;
  let templates: jest.Mocked<
    Pick<Repository<FormTemplate>, 'find' | 'findOne' | 'create' | 'save'>
  >;
  let fields: jest.Mocked<
    Pick<Repository<FormField>, 'findOne' | 'create' | 'save'>
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
    templates = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((x: FormTemplate) => Promise.resolve(x)),
    } as unknown as jest.Mocked<
      Pick<Repository<FormTemplate>, 'find' | 'findOne' | 'create' | 'save'>
    >;
    fields = {
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((x: FormField) => Promise.resolve(x)),
    } as unknown as jest.Mocked<
      Pick<Repository<FormField>, 'findOne' | 'create' | 'save'>
    >;
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormTemplatesService,
        { provide: getRepositoryToken(FormTemplate), useValue: templates },
        { provide: getRepositoryToken(FormField), useValue: fields },
        { provide: SpaceAccessService, useValue: spaceAccess },
        {
          provide: MailService,
          useValue: { sendApplicationAccessEmail: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: { issueApplicantAccessToken: jest.fn() },
        },
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

    const out = await service.create(actor, { groupId: 'g1', name: '  A  ' });

    expect(templates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A',
        groupId: 'g1',
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
      groupId: 'g1',
      status: FormTemplateStatus.PUBLISHED,
    } as FormTemplate);

    await expect(
      service.addField(actor, 't1', {
        fieldKey: 'k',
        label: 'L',
        fieldType: FormFieldType.TEXT,
        required: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_TEMPLATE_IMMUTABLE,
    });
  });

  it('publish rejects when not draft', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormTemplateStatus.ARCHIVED,
    } as FormTemplate);

    await expect(service.publish(actor, 't1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_TEMPLATE_NOT_PUBLISHABLE,
    });
  });
});
