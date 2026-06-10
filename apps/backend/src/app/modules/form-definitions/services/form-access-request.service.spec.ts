import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { AuthService } from '../../auth/services/auth.service';
import { MailService } from '../../mail/services/mail.service';
import { FormAccessRequestService } from './form-access-request.service';

describe('FormAccessRequestService', () => {
  let service: FormAccessRequestService;
  let formDefinitionsRepository: jest.Mocked<
    Pick<
      FormDefinitionsRepository,
      'findPublishedForApplicant' | 'findPublishedForAccessRequest'
    >
  >;
  let authService: jest.Mocked<Pick<AuthService, 'issueApplicantAccessToken'>>;
  let mailService: jest.Mocked<Pick<MailService, 'sendApplicationAccessEmail'>>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    formDefinitionsRepository = {
      findPublishedForApplicant: jest.fn(),
      findPublishedForAccessRequest: jest.fn(),
    };
    authService = {
      issueApplicantAccessToken: jest.fn().mockReturnValue('access-token'),
    };
    mailService = {
      sendApplicationAccessEmail: jest.fn().mockResolvedValue(undefined),
    };
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormAccessRequestService,
        {
          provide: FormDefinitionsRepository,
          useValue: formDefinitionsRepository,
        },
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(FormAccessRequestService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('gets a published form definition for applicant access token scope', async () => {
    const definition = formDefinition();
    formDefinitionsRepository.findPublishedForApplicant.mockResolvedValue(
      definition,
    );

    const out = await service.getPublishedDefinitionForApplicant({
      kind: 'applicant_access',
      tenantId: 'tenant-1',
      email: 'applicant@example.com',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
    });

    expect(out).toBe(definition);
    expect(
      formDefinitionsRepository.findPublishedForApplicant,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
    });
  });

  it('rejects applicant lookup when no published definition is visible', async () => {
    formDefinitionsRepository.findPublishedForApplicant.mockResolvedValue(null);

    await expect(
      service.getPublishedDefinitionForApplicant({
        kind: 'applicant_access',
        tenantId: 'tenant-1',
        email: 'applicant@example.com',
        groupId: 'group-1',
      }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    });
  });

  it('sends an access email with a scoped applicant token', async () => {
    formDefinitionsRepository.findPublishedForAccessRequest.mockResolvedValue([
      formDefinition(),
    ]);

    const out = await service.requestAccess(
      'group-1',
      { email: 'Applicant@Example.COM' },
      'form-1',
    );

    expect(out).toEqual({ accepted: true });
    expect(authService.issueApplicantAccessToken).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      email: 'applicant@example.com',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
    });
    expect(mailService.sendApplicationAccessEmail).toHaveBeenCalledWith({
      to: 'applicant@example.com',
      templateName: 'Expense Form',
      accessToken: 'access-token',
    });
  });

  it('rejects ambiguous access requests when formDefinitionId is omitted', async () => {
    formDefinitionsRepository.findPublishedForAccessRequest.mockResolvedValue([
      formDefinition({ id: 'form-1' }),
      formDefinition({ id: 'form-2' }),
    ]);

    await expect(
      service.requestAccess('group-1', { email: 'applicant@example.com' }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS,
    });
    expect(authService.issueApplicantAccessToken).not.toHaveBeenCalled();
    expect(mailService.sendApplicationAccessEmail).not.toHaveBeenCalled();
  });

  it('rejects access requests when no published definition exists', async () => {
    formDefinitionsRepository.findPublishedForAccessRequest.mockResolvedValue(
      [],
    );

    await expect(
      service.requestAccess('group-1', { email: 'applicant@example.com' }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.FORM_DEFINITION_NOT_FOUND,
    });
  });

  it('converts email delivery failures to internal server errors', async () => {
    formDefinitionsRepository.findPublishedForAccessRequest.mockResolvedValue([
      formDefinition(),
    ]);
    mailService.sendApplicationAccessEmail.mockRejectedValue(
      new Error('smtp unavailable'),
    );

    await expect(
      service.requestAccess('group-1', { email: 'applicant@example.com' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});

function formDefinition(
  overrides: Partial<FormDefinition> = {},
): FormDefinition {
  return {
    id: 'form-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    name: 'Expense Form',
    status: FormDefinitionStatus.PUBLISHED,
    ...overrides,
  } as FormDefinition;
}
