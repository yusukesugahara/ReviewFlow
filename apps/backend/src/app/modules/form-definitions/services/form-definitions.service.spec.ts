import { Test, TestingModule } from '@nestjs/testing';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { FormAccessRequestService } from './form-access-request.service';
import { FormDefinitionCreationService } from './form-definition-creation.service';
import { FormDefinitionFieldsService } from './form-definition-fields.service';
import { FormDefinitionLifecycleService } from './form-definition-lifecycle.service';
import { FormDefinitionQueryService } from './form-definition-query.service';
import { FormDefinitionsService } from './form-definitions.service';

/**
 * FormDefinitionsService のテスト
 *
 * @group form-definitions-service
 */
describe('FormDefinitionsService', () => {
  let service: FormDefinitionsService;
  let formDefinitionCreation: jest.Mocked<
    Pick<FormDefinitionCreationService, 'create'>
  >;
  let formDefinitionQuery: jest.Mocked<
    Pick<
      FormDefinitionQueryService,
      'listByGroup' | 'getOneByGroupForActor' | 'getOne' | 'getOneForActor'
    >
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
  const actor = {
    id: 'u1',
    tenantId: 'ten1',
    email: 'u1@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    formDefinitionCreation = {
      create: jest.fn(),
    };
    formDefinitionQuery = {
      listByGroup: jest.fn(),
      getOneByGroupForActor: jest.fn(),
      getOne: jest.fn(),
      getOneForActor: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormDefinitionsService,
        {
          provide: FormDefinitionCreationService,
          useValue: formDefinitionCreation,
        },
        {
          provide: FormDefinitionQueryService,
          useValue: formDefinitionQuery,
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
      ],
    }).compile();

    service = module.get(FormDefinitionsService);
  });

  /**
   * listByGroup は query 専用サービスへ委譲すること
   */
  it('listByGroup delegates query service', async () => {
    const rows = [
      {
        id: 't1',
        tenantId: 'ten1',
        groupId: 'g1',
        status: FormDefinitionStatus.PUBLISHED,
      } as FormDefinition,
    ];
    formDefinitionQuery.listByGroup.mockResolvedValue(rows);

    const out = await service.listByGroup(actor, 'g1', true);

    expect(out).toBe(rows);
    expect(formDefinitionQuery.listByGroup).toHaveBeenCalledWith(
      actor,
      'g1',
      true,
    );
  });

  /**
   * create は作成専用サービスへ委譲すること
   */
  it('create delegates creation service', async () => {
    const saved = {
      id: 't1',
      tenantId: 'ten1',
      name: 'A',
      description: null,
      status: FormDefinitionStatus.DRAFT,
      createdByUserId: 'u1',
    } as FormDefinition;
    const dto = { groupId: 'g1', name: '  A  ' };
    formDefinitionCreation.create.mockResolvedValue(saved);

    const out = await service.create(actor, dto);

    expect(out).toBe(saved);
    expect(formDefinitionCreation.create).toHaveBeenCalledWith(actor, dto);
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
   * getOne は query 専用サービスへ委譲すること
   */
  it('getOne delegates query service', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    formDefinitionQuery.getOne.mockResolvedValue(definition);

    const out = await service.getOne('ten1', 't1');

    expect(out).toBe(definition);
    expect(formDefinitionQuery.getOne).toHaveBeenCalledWith('ten1', 't1');
  });

  /**
   * getOneForActor は query 専用サービスへ委譲すること
   */
  it('getOneForActor delegates query service', async () => {
    const definition = {
      id: 't1',
      tenantId: 'ten1',
      groupId: 'g1',
      status: FormDefinitionStatus.PUBLISHED,
    } as FormDefinition;
    formDefinitionQuery.getOneForActor.mockResolvedValue(definition);

    const out = await service.getOneForActor(actor, 't1');

    expect(out).toBe(definition);
    expect(formDefinitionQuery.getOneForActor).toHaveBeenCalledWith(
      actor,
      't1',
    );
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
