import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CorrectionTargetsResponseDto } from '../dto/applications.dto';
import { ApplicationAccessPolicy } from '../policies/application-access.policy';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationProgressService } from './application-progress.service';

function isSetupApplication(app: Application): boolean {
  return (
    app.status === ApplicationStatus.DRAFT ||
    app.status === ApplicationStatus.PUBLISHED
  );
}

@Injectable()
export class ApplicationQueryService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly progressService: ApplicationProgressService,
  ) {}

  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    await this.spaceAccess.assertCanUseGroup(actor, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      const rows = await this.applicationsRepository.listForTenantAdmin(
        actor.tenantId,
        groupId,
      );
      return this.hydrateListFormDefinitions(actor.tenantId, rows);
    }

    const rows = await this.applicationsRepository.listForGroup(
      actor.tenantId,
      groupId,
    );
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      groupId,
    );
    const visibleRows = rows.filter(
      (app) =>
        app.applicantUserId === actor.id ||
        this.accessPolicy.actorIsAssignedToCurrentStep(actor, app) ||
        (canManageGroup && isSetupApplication(app)),
    );
    return this.hydrateListFormDefinitions(actor.tenantId, visibleRows);
  }

  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const row = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: true,
    });
    await this.spaceAccess.assertCanUseGroup(actor, row.groupId);
    if (
      isSetupApplication(row) &&
      (await this.spaceAccess.actorCanManageGroup(actor, row.groupId))
    ) {
      return this.progressService.hydrate(row);
    }
    await this.accessPolicy.assertCanRead(
      actor,
      row,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );
    return this.progressService.hydrate(row);
  }

  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, {
      detail: false,
    });
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );

    return this.correctionService.listCorrections(actor.tenantId, app);
  }

  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    const app = await this.loadApplicationOrThrow(
      actor.tenantId,
      applicationId,
      {
        detail: true,
      },
    );
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );

    return this.correctionService.buildTargetsResponse(app);
  }

  private countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.applicationsRepository.countApprovalsByActor(
      applicationId,
      actorId,
    );
  }

  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    withRelations: { detail: boolean },
  ): Promise<Application> {
    const row = await this.applicationsRepository.findById({
      tenantId,
      id,
      detail: withRelations.detail,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }

  private async hydrateListFormDefinitions(
    tenantId: string,
    rows: Application[],
  ): Promise<Application[]> {
    return this.applicationsRepository.hydrateFormDefinitions(tenantId, rows);
  }
}
