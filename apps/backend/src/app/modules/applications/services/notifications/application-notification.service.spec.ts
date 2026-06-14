import type { Application } from '../../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { AuthService } from '../../../auth/services/facades/auth.service';
import type { MailService } from '../../../mail/services/mail.service';
import { ApplicationNotificationService } from './application-notification.service';

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'form-1',
    ...overrides,
  }) as Application;

const template = (overrides: Partial<FormDefinition> = {}): FormDefinition =>
  ({
    id: 'form-1',
    name: 'Expense Form',
    fields: [
      {
        id: 'field-title',
        label: 'Title',
      },
    ],
    ...overrides,
  }) as FormDefinition;

/**
 * ApplicationNotificationService のテスト
 *
 * @group application-notification-service
 */
describe('ApplicationNotificationService', () => {
  let authService: {
    issueApplicantAccessToken: jest.Mock;
  };
  let mailService: {
    sendApplicationReturnedEmail: jest.Mock;
  };
  let service: ApplicationNotificationService;

  beforeEach(() => {
    authService = {
      issueApplicantAccessToken: jest.fn().mockReturnValue('access-token'),
    };
    mailService = {
      sendApplicationReturnedEmail: jest.fn(),
    };
    service = new ApplicationNotificationService(
      authService as unknown as AuthService,
      mailService as unknown as MailService,
    );
  });

  it('sends a returned application email with applicant access token', async () => {
    await service.notifyApplicantOfReturn(app(), template(), {
      overallComment: 'Please fix',
      fields: [
        {
          fieldId: 'field-title',
          comment: 'Fix title',
        },
        {
          fieldId: 'missing-field',
        },
      ],
    });

    expect(authService.issueApplicantAccessToken).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      email: 'applicant@example.com',
      groupId: 'group-1',
      formDefinitionId: 'form-1',
      applicationId: 'app-1',
    });
    expect(mailService.sendApplicationReturnedEmail).toHaveBeenCalledWith({
      to: 'applicant@example.com',
      applicationId: 'app-1',
      accessToken: 'access-token',
      groupId: 'group-1',
      templateName: 'Expense Form',
      overallComment: 'Please fix',
      fields: [
        {
          label: 'Title',
          comment: 'Fix title',
        },
        {
          label: 'missing-field',
          comment: null,
        },
      ],
    });
  });

  it('does not fail the business action when email sending fails', async () => {
    mailService.sendApplicationReturnedEmail.mockRejectedValue(
      new Error('smtp unavailable'),
    );

    await expect(
      service.notifyApplicantOfReturn(app(), template(), {
        fields: [{ fieldId: 'field-title' }],
      }),
    ).resolves.toBeUndefined();
  });
});
