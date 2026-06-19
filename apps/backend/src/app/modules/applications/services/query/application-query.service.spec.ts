import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import type { ApplicationCorrectionService } from '../review/application-correction.service';
import type { ApplicationProgressService } from '../progress/application-progress.service';
import { ApplicationQueryService } from './application-query.service';
import type { ApplicationReadAccessService } from '../access/application-read-access.service';

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
    findByIdInTenant: jest.Mock;
    listForGroup: jest.Mock;
    listForTenantAdminPage: jest.Mock;
    listForTenantAdmin: jest.Mock;
    listVisibleForActorPage: jest.Mock;
  };
  let spaceAccess: {
    actorCanManageGroup: jest.Mock;
    assertCanUseGroup: jest.Mock;
  };
  let accessPolicy: {
    actorIsAssignedToCurrentStep: jest.Mock;
    canListForActor: jest.Mock;
    assertCanRead: jest.Mock;
  };
  let correctionService: {
    buildTargetsResponse: jest.Mock;
    listCorrections: jest.Mock;
  };
  let progressService: {
    hydrate: jest.Mock;
  };
  let readAccess: {
    loadReadable: jest.Mock;
  };
  let service: ApplicationQueryService;

  beforeEach(() => {
    applicationsRepository = {
      countApprovalsByActor: jest.fn(),
      findByIdInTenant: jest.fn(),
      listForGroup: jest.fn(),
      listForTenantAdminPage: jest.fn(),
      listForTenantAdmin: jest.fn(),
      listVisibleForActorPage: jest.fn(),
    };
    spaceAccess = {
      actorCanManageGroup: jest.fn(),
      assertCanUseGroup: jest.fn(),
    };
    accessPolicy = {
      actorIsAssignedToCurrentStep: jest.fn(),
      canListForActor: jest.fn(
        (
          currentActor: AuthUserPayload,
          row: Application,
          canManageGroup: boolean,
        ): boolean => {
          const isSetup =
            row.status === ApplicationStatus.DRAFT ||
            row.status === ApplicationStatus.PUBLISHED;
          return (
            row.applicantUserId === currentActor.id ||
            (canManageGroup && isSetup)
          );
        },
      ),
      assertCanRead: jest.fn(),
    };
    correctionService = {
      buildTargetsResponse: jest.fn(),
      listCorrections: jest.fn(),
    };
    progressService = {
      hydrate: jest.fn((row: Application) => Promise.resolve(row)),
    };
    readAccess = {
      loadReadable: jest.fn(),
    };
    service = new ApplicationQueryService(
      applicationsRepository as unknown as ApplicationQueryRepository,
      spaceAccess as unknown as SpaceAccessService,
      accessPolicy as unknown as ApplicationAccessPolicy,
      correctionService as unknown as ApplicationCorrectionService,
      progressService as unknown as ApplicationProgressService,
      readAccess as unknown as ApplicationReadAccessService,
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
    accessPolicy.canListForActor.mockImplementation(
      (_actor: AuthUserPayload, row: Application) =>
        row.id === 'own' || row.id === 'assigned',
    );

    await expect(service.listForActor(actor(), 'group-1')).resolves.toEqual([
      own,
      assigned,
    ]);
  });

  it('loads tenant admin application pages through the repository', async () => {
    const page = {
      nodes: [app({ id: 'page-app' })],
      offset: 10,
      totalCount: 30,
    };
    applicationsRepository.listForTenantAdminPage.mockResolvedValue(page);

    await expect(
      service.listConnectionForActor(
        actor({ roles: [UserRole.TENANT_ADMIN] }),
        'group-1',
        { offset: 10, limit: 20 },
      ),
    ).resolves.toEqual(page);

    expect(spaceAccess.assertCanUseGroup).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
      'group-1',
    );
    expect(applicationsRepository.listForTenantAdminPage).toHaveBeenCalledWith(
      'tenant-1',
      'group-1',
      { offset: 10, limit: 20 },
    );
  });

  it('loads regular user application pages with DB-level visibility conditions', async () => {
    const page = { nodes: [app({ id: 'visible' })], offset: 0, totalCount: 1 };
    applicationsRepository.listVisibleForActorPage.mockResolvedValue(page);
    spaceAccess.actorCanManageGroup.mockResolvedValue(true);

    await expect(
      service.listConnectionForActor(actor(), 'group-1', {
        offset: 0,
        limit: 20,
      }),
    ).resolves.toEqual(page);

    expect(applicationsRepository.listVisibleForActorPage).toHaveBeenCalledWith(
      {
        actorId: 'user-1',
        canManageGroup: true,
        groupId: 'group-1',
        tenantId: 'tenant-1',
      },
      { offset: 0, limit: 20 },
    );
  });

  it('loads detail applications through read access before hydrating progress', async () => {
    const setupApp = app({ status: ApplicationStatus.PUBLISHED });
    readAccess.loadReadable.mockResolvedValue(setupApp);

    await expect(service.getOneForActor(actor(), 'app-1')).resolves.toBe(
      setupApp,
    );

    expect(readAccess.loadReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'app-1',
      {
        detail: true,
        allowManagingSetup: true,
      },
    );
    expect(progressService.hydrate).toHaveBeenCalledWith(setupApp);
  });

  it('checks read access before listing corrections', async () => {
    const row = app({ status: ApplicationStatus.RETURNED });
    const corrections = { corrections: [] };
    readAccess.loadReadable.mockResolvedValue(row);
    correctionService.listCorrections.mockResolvedValue(corrections);

    await expect(
      service.getCorrectionsForActor(actor(), 'app-1'),
    ).resolves.toEqual(corrections);

    expect(readAccess.loadReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'app-1',
      { detail: false },
    );
    expect(correctionService.listCorrections).toHaveBeenCalledWith(
      'tenant-1',
      row,
    );
  });
});
