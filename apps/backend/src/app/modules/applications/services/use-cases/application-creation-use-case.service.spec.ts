import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { Application } from '../../../../../models/entities/application.entity';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { BusinessAuditLogService } from '../../../audit-logs/services/business-audit-log.service';
import type { CreateApplicationDto } from '../../dto/applications.dto';
import type { ApplicationCreationService } from '../creation/application-creation.service';
import type { TransactionManager } from '../../../../transaction';
import { ApplicationCreationUseCaseService } from './application-creation-use-case.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  tenantId: 'tenant-1',
  roles: ['tenant_user'],
  ...overrides,
});

const dto = (
  overrides: Partial<CreateApplicationDto> = {},
): CreateApplicationDto => ({
  groupId: 'group-1',
  formDefinitionId: 'form-1',
  approvalFlowId: 'flow-1',
  values: { title: 'Expense' },
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantUserId: 'user-1',
    applicantEmail: 'user@example.com',
    ...overrides,
  }) as Application;

/**
 * ApplicationCreationUseCaseService のテスト
 *
 * @group application-creation-use-case-service
 */
describe('ApplicationCreationUseCaseService', () => {
  let spaceAccess: {
    assertCanUseGroup: jest.Mock;
  };
  let creationService: {
    create: jest.Mock;
  };
  let auditLogs: {
    recordApplicationEvent: jest.Mock;
  };
  let transactionManager: TransactionManager;
  let transactions: ConstructorParameters<
    typeof ApplicationCreationUseCaseService
  >[3];
  let service: ApplicationCreationUseCaseService;

  beforeEach(() => {
    spaceAccess = {
      assertCanUseGroup: jest.fn(),
    };
    creationService = {
      create: jest.fn(),
    };
    auditLogs = {
      recordApplicationEvent: jest.fn(),
    };
    transactionManager = {} as TransactionManager;
    transactions = {
      run: jest.fn(<T>(work: (manager: TransactionManager) => Promise<T>) =>
        work(transactionManager),
      ),
    } as unknown as ConstructorParameters<
      typeof ApplicationCreationUseCaseService
    >[3];
    service = new ApplicationCreationUseCaseService(
      spaceAccess as unknown as SpaceAccessService,
      creationService as unknown as ApplicationCreationService,
      auditLogs as unknown as BusinessAuditLogService,
      transactions,
    );
  });

  it('checks group access and creates an application for the authenticated actor', async () => {
    const input = dto();
    const created = app();
    creationService.create.mockResolvedValue(created);

    await expect(service.create(actor(), input)).resolves.toBe(created);

    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        tenantId: 'tenant-1',
      }),
      'group-1',
    );
    expect(creationService.create).toHaveBeenCalledWith(
      'tenant-1',
      'user@example.com',
      'user-1',
      input,
      transactionManager,
    );
    expect(auditLogs.recordApplicationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.created',
        app: created,
      }),
      transactionManager,
    );
  });

  it('does not create an application when group access is denied', async () => {
    spaceAccess.assertCanUseGroup.mockRejectedValue(new Error('forbidden'));

    await expect(service.create(actor(), dto())).rejects.toThrow('forbidden');

    expect(creationService.create).not.toHaveBeenCalled();
  });
});
