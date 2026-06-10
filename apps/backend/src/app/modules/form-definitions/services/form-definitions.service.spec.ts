import { Test, TestingModule } from '@nestjs/testing';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { FormAccessRequestService } from './form-access-request.service';
import { FormDefinitionFieldsService } from './form-definition-fields.service';
import { FormDefinitionLifecycleService } from './form-definition-lifecycle.service';
import { FormDefinitionsService } from './form-definitions.service';

/**
 * FormDefinitionsService のテスト
 *
 * @group form-definitions-service
 */
describe('FormDefinitionsService', () => {
  let service: FormDefinitionsService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<FormDefinitionsRepository, 'createDefinition' | 'findByIdWithFields'>
  >;
  let formDefinitionFields: jest.Mocked<
    Pick<
      FormDefinitionFieldsService,
      'addField' | 'moveField' | 'deleteField' | 'updateFieldSettings'
    >
  >;
  let formAccessRequests: jest.Mocked<
    Pick<
      FormAccessRequestService,
      'getPublishedDefinitionForApplicant' | 'requestAccess'
    >
  >;
  let formDefinitionLifecycle: jest.Mocked<
    Pick<
      FormDefinitionLifecycleService,
      'publish' | 'archive' | 'restore' | 'updateDescription'
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
      createDefinition: jest.fn(),
      findByIdWithFields: jest.fn(),
    };
    formDefinitionFields = {
      addField: jest.fn(),
      moveField: jest.fn(),
      deleteField: jest.fn(),
      updateFieldSettings: jest.fn(),
    };
    formAccessRequests = {
      getPublishedDefinitionForApplicant: jest.fn(),
      requestAccess: jest.fn(),
    };
    formDefinitionLifecycle = {
      publish: jest.fn(),
      archive: jest.fn(),
      restore: jest.fn(),
      updateDescription: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
      assertCanUseGroup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionsService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        {
          provide: FormDefinitionFieldsService,
          useValue: formDefinitionFields,
        },
        {
          provide: FormAccessRequestService,
          useValue: formAccessRequests,
        },
        {
          provide: FormDefinitionLifecycleService,
          useValue: formDefinitionLifecycle,
        },
        { provide: SpaceAccessService, useValue: spaceAccess },
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
    formDefinitionsRepository.createDefinition.mockResolvedValue(saved);

    const out = await service.create(actor, { groupId: 'g1', name: '  A  ' });

    expect(formDefinitionsRepository.createDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A',
        groupId: 'g1',
        createdByUserId: 'u1',
      }),
    );
    expect(out.id).toBe('t1');
  });

  /**
   * addField はフォーム項目専用サービスへ委譲すること
   */
  it('addField delegates field editing to FormDefinitionFieldsService', async () => {
    const saved = {
      id: 'field1',
      fieldKey: 'k',
      label: 'L',
      fieldType: FormFieldType.TEXT,
      required: true,
      sortOrder: 0,
    } as FormField;
    const dto = {
      fieldKey: 'k',
      label: 'L',
      fieldType: FormFieldType.TEXT,
      required: true,
      sortOrder: 0,
    };
    formDefinitionFields.addField.mockResolvedValue(saved);

    const out = await service.addField(actor, 't1', dto);

    expect(out).toBe(saved);
    expect(formDefinitionFields.addField).toHaveBeenCalledWith(
      actor,
      't1',
      dto,
    );
  });

  /**
   * publish は lifecycle 専用サービスへ委譲すること
   */
  it('publish delegates lifecycle transition', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    formDefinitionLifecycle.publish.mockResolvedValue(definition);

    const out = await service.publish(actor, 't1');

    expect(out).toBe(definition);
    expect(formDefinitionLifecycle.publish).toHaveBeenCalledWith(actor, 't1');
  });

  /**
   * archive は lifecycle 専用サービスへ委譲すること
   */
  it('archive delegates lifecycle transition', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.ARCHIVED,
    } as FormDefinition;
    formDefinitionLifecycle.archive.mockResolvedValue(definition);

    const out = await service.archive(actor, 't1');

    expect(out).toBe(definition);
    expect(formDefinitionLifecycle.archive).toHaveBeenCalledWith(actor, 't1');
  });

  /**
   * restore は lifecycle 専用サービスへ委譲すること
   */
  it('restore delegates lifecycle transition', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.DRAFT,
    } as FormDefinition;
    formDefinitionLifecycle.restore.mockResolvedValue(definition);

    const out = await service.restore(actor, 't1');

    expect(out).toBe(definition);
    expect(formDefinitionLifecycle.restore).toHaveBeenCalledWith(actor, 't1');
  });

  it('updateDescription delegates lifecycle mutation', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      description: 'new',
    } as FormDefinition;
    const dto = { description: ' new ' };
    formDefinitionLifecycle.updateDescription.mockResolvedValue(definition);

    const out = await service.updateDescription(actor, 't1', dto);

    expect(out).toBe(definition);
    expect(formDefinitionLifecycle.updateDescription).toHaveBeenCalledWith(
      actor,
      't1',
      dto,
    );
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
    formDefinitionsRepository.findByIdWithFields.mockResolvedValue(definition);

    const out = await service.getOneForActor(actor, 't1');

    expect(out).toBe(definition);
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(actor, 'g1');
    expect(spaceAccess.assertCanManageGroup).not.toHaveBeenCalled();
  });

  it('getPublishedDefinitionForApplicant delegates public applicant lookup', async () => {
    const applicant = {
      kind: 'applicant_access',
      tenantId: 'ten1',
      email: 'applicant@example.com',
      groupId: 'g1',
      formDefinitionId: 't1',
    } satisfies ApplicantAccessTokenPayload;
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    formAccessRequests.getPublishedDefinitionForApplicant.mockResolvedValue(
      definition,
    );

    const out = await service.getPublishedDefinitionForApplicant(applicant);

    expect(out).toBe(definition);
    expect(
      formAccessRequests.getPublishedDefinitionForApplicant,
    ).toHaveBeenCalledWith(applicant);
  });

  it('requestAccess delegates public access email flow', async () => {
    formAccessRequests.requestAccess.mockResolvedValue({ accepted: true });

    const out = await service.requestAccess(
      'g1',
      { email: 'applicant@example.com' },
      't1',
    );

    expect(out).toEqual({ accepted: true });
    expect(formAccessRequests.requestAccess).toHaveBeenCalledWith(
      'g1',
      { email: 'applicant@example.com' },
      't1',
    );
  });
});
