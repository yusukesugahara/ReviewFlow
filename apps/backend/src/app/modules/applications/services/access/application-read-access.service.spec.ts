import { ClientErrorCodes } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationReadAccessService } from './application-read-access.service';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  tenantId: 'tenant-1',
  roles: [UserRole.TENANT_USER],
  ...overrides,
});

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantUserId: 'other-user',
    applicantEmail: 'other@example.com',
    status: ApplicationStatus.IN_REVIEW,
    currentStepOrder: null,
    approvalFlow: { steps: [] },
    ...overrides,
  }) as Application;

describe('ApplicationReadAccessService', () => {
  let queryRepository: {
    countApprovalsByActor: jest.Mock;
    findByIdInTenant: jest.Mock;
  };
  let spaceAccess: {
    actorCanManageGroup: jest.Mock;
    assertCanUseGroup: jest.Mock;
  };
  let accessPolicy: ApplicationAccessPolicy;
  let service: ApplicationReadAccessService;

  beforeEach(() => {
    queryRepository = {
      countApprovalsByActor: jest.fn(),
      findByIdInTenant: jest.fn(),
    };
    spaceAccess = {
      actorCanManageGroup: jest.fn(),
      assertCanUseGroup: jest.fn(),
    };
    accessPolicy = new ApplicationAccessPolicy();
    service = new ApplicationReadAccessService(
      queryRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy,
    );
  });

  it('loads tenant scoped applications and checks space access', async () => {
    const row = app({ applicantUserId: 'user-1' });
    queryRepository.findByIdInTenant.mockResolvedValue(row);

    await expect(
      service.loadReadable(actor(), 'app-1', { detail: true }),
    ).resolves.toBe(row);

    expect(queryRepository.findByIdInTenant).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      id: 'app-1',
      detail: true,
    });
    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'group-1',
    );
  });

  it('allows group managers to read setup applications without approval history', async () => {
    const row = app({ status: ApplicationStatus.PUBLISHED });
    queryRepository.findByIdInTenant.mockResolvedValue(row);
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);
    queryRepository.countApprovalsByActor.mockResolvedValue(0);

    await expect(
      service.loadReadable(actor(), 'app-1', {
        detail: true,
        allowManagingSetup: true,
      }),
    ).resolves.toBe(row);

    expect(spaceAccess.actorCanManageGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'group-1',
    );
    expect(queryRepository.countApprovalsByActor).not.toHaveBeenCalled();
  });

  it('uses approval history for non setup application reads', async () => {
    const row = app();
    queryRepository.findByIdInTenant.mockResolvedValue(row);
    queryRepository.countApprovalsByActor.mockResolvedValue(1);

    await expect(
      service.loadReadable(actor(), 'app-1', { detail: false }),
    ).resolves.toBe(row);

    expect(queryRepository.countApprovalsByActor).toHaveBeenCalledWith(
      'app-1',
      'user-1',
    );
  });

  it('rejects missing applications', async () => {
    queryRepository.findByIdInTenant.mockResolvedValue(null);

    await expect(
      service.loadReadable(actor(), 'missing-app', { detail: false }),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_NOT_FOUND,
    });
  });
});
