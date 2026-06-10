import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CorrectionTargetsResponseDto } from '../dto/applications.dto';
import { ApplicationAccessPolicy } from '../policies/application-access.policy';
import { ApplicationCorrectionService } from './application-correction.service';
import { ApplicationProgressService } from './application-progress.service';
import { ApplicationReadAccessService } from './application-read-access.service';

@Injectable()
export class ApplicationQueryService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly progressService: ApplicationProgressService,
    private readonly readAccess: ApplicationReadAccessService,
  ) {}

  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    await this.spaceAccess.assertCanUseGroup(actor, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      const rows = await this.queryRepository.listForTenantAdmin(
        actor.tenantId,
        groupId,
      );
      return this.hydrateListFormDefinitions(actor.tenantId, rows);
    }

    const rows = await this.queryRepository.listForGroup(
      actor.tenantId,
      groupId,
    );
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      groupId,
    );
    const visibleRows = rows.filter((app) =>
      this.accessPolicy.canListForActor(actor, app, canManageGroup),
    );
    return this.hydrateListFormDefinitions(actor.tenantId, visibleRows);
  }

  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const row = await this.readAccess.loadReadable(actor, id, {
      detail: true,
      allowManagingSetup: true,
    });
    return this.progressService.hydrate(row);
  }

  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    const app = await this.readAccess.loadReadable(actor, id, {
      detail: false,
    });

    return this.correctionService.listCorrections(actor.tenantId, app);
  }

  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    const app = await this.readAccess.loadReadable(actor, applicationId, {
      detail: true,
    });

    return this.correctionService.buildTargetsResponse(app);
  }

  private async hydrateListFormDefinitions(
    tenantId: string,
    rows: Application[],
  ): Promise<Application[]> {
    return this.queryRepository.hydrateFormDefinitions(tenantId, rows);
  }
}
