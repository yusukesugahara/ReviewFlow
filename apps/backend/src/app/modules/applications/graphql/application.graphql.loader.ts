import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import {
  APPLICATION_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import {
  connectionFromOffsetPage,
  resolveOffsetPagination,
} from '../../../../common/graphql/relay-pagination';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type {
  ApplicationDetailDto,
  ApplicationSummaryDto,
} from '../dto/applications.dto';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationsService } from '../services/facades/applications.service';
import type {
  ApplicationCorrectionGql,
  ApplicationCorrectionTargetsGql,
  ApplicationDetailGql,
  ApplicationSummaryConnectionGql,
  ApplicationSummaryGql,
} from './application.graphql.types';

type ActorScopedKey = {
  actor: AuthUserPayload;
  id: string;
};

type GroupScopedKey = {
  actor: AuthUserPayload;
  groupId: string;
};

@Injectable({ scope: Scope.REQUEST })
export class ApplicationGraphqlLoader {
  constructor(private readonly applications: ApplicationsService) {}

  private readonly summariesByGroup = new DataLoader<
    GroupScopedKey,
    ApplicationSummaryGql[],
    string
  >(
    async (keys) =>
      Promise.all(keys.map((key) => this.loadSummariesForGroup(key))),
    { cacheKeyFn: (key) => this.groupCacheKey(key) },
  );

  private readonly detailById = new DataLoader<
    ActorScopedKey,
    ApplicationDetailGql,
    string
  >(async (keys) => Promise.all(keys.map((key) => this.loadDetailById(key))), {
    cacheKeyFn: (key) => this.actorScopedCacheKey(key),
  });

  private readonly correctionsByApplicationId = new DataLoader<
    ActorScopedKey,
    ApplicationCorrectionGql[],
    string
  >(async (keys) => Promise.all(keys.map((key) => this.loadCorrections(key))), {
    cacheKeyFn: (key) => this.actorScopedCacheKey(key),
  });

  private readonly correctionTargetsByApplicationId = new DataLoader<
    ActorScopedKey,
    ApplicationCorrectionTargetsGql,
    string
  >(
    async (keys) =>
      Promise.all(keys.map((key) => this.loadCorrectionTargetsById(key))),
    { cacheKeyFn: (key) => this.actorScopedCacheKey(key) },
  );

  listApplications(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<ApplicationSummaryGql[]> {
    return this.summariesByGroup.load({ actor, groupId });
  }

  async listApplicationsConnection({
    actor,
    after,
    first,
    groupId,
  }: {
    actor: AuthUserPayload;
    after?: string | null;
    first: number;
    groupId: string;
  }): Promise<ApplicationSummaryConnectionGql> {
    const page = await this.applications.listConnectionForActor(
      actor,
      groupId,
      resolveOffsetPagination({ after, first }),
    );
    return connectionFromOffsetPage({
      nodes: page.nodes.map((row) =>
        this.toGraphqlSummary(this.applications.toSummary(row)),
      ),
      offset: page.offset,
      totalCount: page.totalCount,
    });
  }

  getApplication(
    actor: AuthUserPayload,
    id: string,
  ): Promise<ApplicationDetailGql> {
    return this.detailById.load({ actor, id });
  }

  async toDetailForActor(
    row: Application,
    actor: AuthUserPayload,
  ): Promise<ApplicationDetailGql> {
    return this.toGraphqlDetail(
      await this.applications.toDetailForActor(row, actor),
    );
  }

  listCorrections(
    actor: AuthUserPayload,
    id: string,
  ): Promise<ApplicationCorrectionGql[]> {
    return this.correctionsByApplicationId.load({ actor, id });
  }

  getCorrectionTargets(
    actor: AuthUserPayload,
    id: string,
  ): Promise<ApplicationCorrectionTargetsGql> {
    return this.correctionTargetsByApplicationId.load({ actor, id });
  }

  private async loadSummariesForGroup(
    key: GroupScopedKey,
  ): Promise<ApplicationSummaryGql[]> {
    const rows = await this.applications.listForActor(key.actor, key.groupId);
    return rows.map((row) =>
      this.toGraphqlSummary(this.applications.toSummary(row)),
    );
  }

  private async loadDetailById(
    key: ActorScopedKey,
  ): Promise<ApplicationDetailGql> {
    const row = await this.applications.getOneForActor(key.actor, key.id);
    return this.toGraphqlDetail(
      await this.applications.toDetailForActor(row, key.actor),
    );
  }

  private async loadCorrections(
    key: ActorScopedKey,
  ): Promise<ApplicationCorrectionGql[]> {
    const data = await this.applications.getCorrectionsForActor(
      key.actor,
      key.id,
    );
    return data.corrections;
  }

  private loadCorrectionTargetsById(
    key: ActorScopedKey,
  ): Promise<ApplicationCorrectionTargetsGql> {
    return this.applications.getCorrectionTargetsForActor(key.actor, key.id);
  }

  private actorScopedCacheKey(key: ActorScopedKey): string {
    return JSON.stringify([this.actorCacheKey(key.actor), key.id]);
  }

  private groupCacheKey(key: GroupScopedKey): string {
    return JSON.stringify([this.actorCacheKey(key.actor), key.groupId]);
  }

  private actorCacheKey(actor: AuthUserPayload): string {
    return JSON.stringify([
      actor.tenantId,
      actor.id,
      actor.email,
      [...actor.roles].sort(),
    ]);
  }

  private toGraphqlSummary(
    summary: ApplicationSummaryDto,
  ): ApplicationSummaryGql {
    return {
      ...summary,
      __typename: 'ApplicationSummary',
      databaseId: summary.id,
      id: toRelayGlobalId(APPLICATION_RELAY_NODE_TYPE, summary.id),
    };
  }

  private toGraphqlDetail(detail: ApplicationDetailDto): ApplicationDetailGql {
    return {
      ...detail,
      __typename: 'ApplicationDetail',
      databaseId: detail.id,
      id: toRelayGlobalId(APPLICATION_RELAY_NODE_TYPE, detail.id),
    };
  }
}
