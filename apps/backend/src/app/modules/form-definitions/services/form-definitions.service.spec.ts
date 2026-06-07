import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../../common/errors';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { AuthService } from '../../auth/services/auth.service';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { MailService } from '../../mail/services/mail.service';
import { FormDefinitionsService } from './form-definitions.service';

/**
 * FormDefinitionsService のテスト
 *
 * @group form-definitions-service
 */
describe('FormDefinitionsService', () => {
  let service: FormDefinitionsService;
  let templates: jest.Mocked<
    Pick<Repository<FormDefinition>, 'find' | 'findOne' | 'create' | 'save'>
  >;
  let fields: jest.Mocked<
    Pick<Repository<FormField>, 'findOne' | 'create' | 'save'>
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
    templates = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x: object) => ({ ...x })),
      save: jest.fn((x: FormDefinition) => Promise.resolve(x)),
    } as unknown as jest.Mocked<
      Pick<Repository<FormDefinition>, 'find' | 'findOne' | 'create' | 'save'>
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
      assertCanUseGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionsService,
        { provide: getRepositoryToken(FormDefinition), useValue: templates },
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

    service = module.get(FormDefinitionsService);
  });

  /**
   * create は草稿定義を保存すること
   */
  it('create saves draft definition', async () => {
    const saved = {
      id: 't1',
      tenantId: 'ten1',
      name: 'A',
      description: null,
      status: FormDefinitionStatus.DRAFT,
      createdByUserId: 'u1',
    } as FormDefinition;
    templates.save.mockResolvedValue(saved);

    const out = await service.create(actor, { groupId: 'g1', name: '  A  ' });

    expect(templates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A',
        groupId: 'g1',
        status: FormDefinitionStatus.DRAFT,
        createdByUserId: 'u1',
      }),
    );
    expect(out.id).toBe('t1');
  });

  /**
   * addField は草稿定義でない場合にエラーを返すこと
   */
  it('addField rejects when definition not draft', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition);

    await expect(
      service.addField(actor, 't1', {
        fieldKey: 'k',
        label: 'L',
        fieldType: FormFieldType.TEXT,
        required: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_IMMUTABLE,
    });
  });

  /**
   * publish は草稿定義でない場合にエラーを返すこと
   */
  it('publish rejects when not draft', async () => {
    templates.findOne.mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.ARCHIVED,
    } as FormDefinition);

    await expect(service.publish(actor, 't1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_PUBLISHABLE,
    });
  });

  /**
   * archive は管理権限を確認し、定義をアーカイブにすること
   */
  it('archive marks definition as archived after management check', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    templates.findOne.mockResolvedValue(definition);
    templates.save.mockResolvedValue(definition);

    const out = await service.archive(actor, 't1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(out.status).toBe(FormDefinitionStatus.ARCHIVED);
    expect(out.archivedFromStatus).toBe(FormDefinitionStatus.PUBLISHED);
    expect(templates.save).toHaveBeenCalledWith(definition);
  });

  /**
   * restore は管理権限を確認し、アーカイブされた定義を元のステータスに戻すこと
   */
  it('restore moves archived definition back to its previous status', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.ARCHIVED,
      archivedFromStatus: FormDefinitionStatus.DRAFT,
    } as FormDefinition;
    templates.findOne.mockResolvedValue(definition);
    templates.save.mockResolvedValue(definition);

    const out = await service.restore(actor, 't1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(out.status).toBe(FormDefinitionStatus.DRAFT);
    expect(out.archivedFromStatus).toBeNull();
    expect(templates.save).toHaveBeenCalledWith(definition);
  });

  /**
   * getOneForActor はスペース利用権限のみを確認すること
   */
  it('getOneForActor requires space usage access only', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    templates.findOne.mockResolvedValue(definition);

    const out = await service.getOneForActor(actor, 't1');

    expect(out).toBe(definition);
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(spaceAccess.assertCanManageGroup).not.toHaveBeenCalled();
  });
});
