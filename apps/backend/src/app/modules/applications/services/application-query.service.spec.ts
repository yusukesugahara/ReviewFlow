import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../groups/services/space-access.service';
import type { ApplicationAccessPolicy } from '../policies/application-access.policy';
import type { ApplicationCorrectionService } from './application-correction.service';
import type { ApplicationProgressService } from './application-progress.service';
import { ApplicationQueryService } from './application-query.service';

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
    applicantUserId: 'user-1',
    applicantEmail: 'user@example.com',
    status: ApplicationStatus.DRAFT,
    approvalFlow: { steps: [] },
    currentStepOrder: null,
    fieldValues: [],
    ...overrides,
  }) as Application;

/**
 * ApplicationQueryService のテスト
 *
 * @group application-query-service
 */
describe('ApplicationQueryService', () => {
  let applicationsRepository: {
    countApprovalsByActor: jest.Mock;
    findById: jest.Mock;
    hydrateFormDefinitions: jest.Mock;
    listForGroup: jest.Mock;
    listForTenantAdmin: jest.Mock;
  };
  let spaceAccess: {
    actorCanManageGroup: jest.Mock;
    assertCanUseGroup: jest.Mock;
  };
  let accessPolicy: {
    actorIsAssignedToCurrentStep: jest.Mock;
    assertCanRead: jest.Mock;
  };
  let correctionService: {
    buildTargetsResponse: jest.Mock;
    listCorrections: jest.Mock;
  };
  let progressService: {
    hydrate: jest.Mock;
  };
  let service: ApplicationQueryService;

  beforeEach(() => {
    applicationsRepository = {
      countApprovalsByActor: jest.fn(),
      findById: jest.fn(),
      hydrateFormDefinitions: jest.fn((_, rows: Application[]) =>
        Promise.resolve(rows),
      ),
      listForGroup: jest.fn(),
      listForTenantAdmin: jest.fn(),
    };
    spaceAccess = {
      actorCanManageGroup: jest.fn(),
      assertCanUseGroup: jest.fn(),
    };
    accessPolicy = {
      actorIsAssignedToCurrentStep: jest.fn(),
      assertCanRead: jest.fn(),
    };
    correctionService = {
      buildTargetsResponse: jest.fn(),
      listCorrections: jest.fn(),
    };
    progressService = {
      hydrate: jest.fn((row: Application) => Promise.resolve(row)),
    };
    service = new ApplicationQueryService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy as unknown as ApplicationAccessPolicy,
      correctionService as unknown as ApplicationCorrectionService,
      progressService as unknown as ApplicationProgressService,
    );
  });

  it('lists tenant applications for tenant admins', async () => {
    const rows = [app({ id: 'admin-visible' })];
    applicationsRepository.listForTenantAdmin.mockResolvedValue(rows);

    await expect(
      service.listForActor(
        actor({ roles: [UserRole.TENANT_ADMIN] }),
        'group-1',
      ),
    ).resolves.toEqual(rows);

    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
      'group-1',
    );
    expect(applicationsRepository.listForTenantAdmin).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
    );
    expect(applicationsRepository.listForGroup).not.toHaveBeenCalled();
  });

  it('filters group applications for regular users', async () => {
    const own = app({ id: 'own', applicantUserId: 'user-1' });
    const assigned = app({
      id: 'assigned',
      applicantUserId: 'other-user',
      status: ApplicationStatus.IN_REVIEW,
    });
    const hiddenSetup = app({
      id: 'hidden-setup',
      applicantUserId: 'other-user',
      status: ApplicationStatus.DRAFT,
    });
    applicationsRepository.listForGroup.mockResolvedValue([
      own,
      assigned,
      hiddenSetup,
    ]);
    spaceAccess.actorCanManageGroup.mockResolvedValue(false);
    accessPolicy.actorIsAssignedToCurrentStep.mockImplementation(
      (_actor: AuthUserPayload, row: Application) => row.id === 'assigned',
    );

    await expect(service.listForActor(actor(), 'group-1')).resolves.toEqual([
      own,
      assigned,
    ]);

    expect(applicationsRepository.hydrateFormDefinitions).toHaveBeenCalledWith(
      'tenant-1',
      [own, assigned],
    );
  });

  it('allows group managers to read setup applications without read policy', async () => {
    const setupApp = app({ status: ApplicationStatus.PUBLISHED });
    applicationsRepository.findById.mockResolvedValue(setupApp);
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);

    await expect(service.getOneForActor(actor(), 'app-1')).resolves.toBe(
      setupApp,
    );

    expect(accessPolicy.assertCanRead).not.toHaveBeenCalled();
    expect(progressService.hydrate).toHaveBeenCalledWith(setupApp);
  });

  it('checks read access before listing corrections', async () => {
    const row = app({ status: ApplicationStatus.RETURNED });
    const corrections = { corrections: [] };
    applicationsRepository.findById.mockResolvedValue(row);
    correctionService.listCorrections.mockResolvedValue(corrections);

    await expect(
      service.getCorrectionsForActor(actor(), 'app-1'),
    ).resolves.toEqual(corrections);

    expect(accessPolicy.assertCanRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      row,
      expect.any(Function),
    );
    expect(correctionService.listCorrections).toHaveBeenCalledWith(
      'tenant-1',
      row,
    );
  });
});
