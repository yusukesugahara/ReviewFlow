import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../../../models/constants/group-member-role';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Group } from '../../../../../models/entities/group.entity';
import {
  SpaceDashboardRepository,
  type SpaceDashboardAggregate,
} from '../../../../../models/repositories/space-dashboard.repository';
import { GroupsService } from '../facades/groups.service';

export type SpaceDashboardSummary = {
  id: string;
  name: string;
  description: string | null;
  currentUserRole: string | null;
  memberCount: number;
  formCount: number;
  publishedFormCount: number;
  totalApplications: number;
  needsActionCount: number;
  returnedCount: number;
  approvedCount: number;
  rejectedCount: number;
  correctionCount: number;
  resubmitCount: number;
  avgReturns: string;
  latestApplicationAt: string | null;
};

@Injectable()
export class SpaceDashboardService {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly dashboardRepository: SpaceDashboardRepository,
  ) {}

  async list(actor: AuthUserPayload): Promise<SpaceDashboardSummary[]> {
    const groups = await this.groupsService.list(actor);
    if (groups.length === 0) {
      return [];
    }

    const canReadAllApplications = actor.roles.includes(UserRole.TENANT_ADMIN);
    const groupIds = groups.map((group) => group.id);
    const manageableGroupIds = canReadAllApplications
      ? groupIds
      : groups
          .filter((group) => group.currentUserRole === GroupMemberRole.ADMIN)
          .map((group) => group.id);
    const aggregates = await this.dashboardRepository.getDashboardAggregates({
      tenantId: actor.tenantId,
      groupIds,
      actorId: actor.id,
      canReadAllApplications,
      manageableGroupIds,
    });
    const aggregatesByGroupId = new Map(
      aggregates.map((aggregate) => [aggregate.groupId, aggregate]),
    );

    return groups.map((group) =>
      toDashboardSummary(group, aggregatesByGroupId.get(group.id)),
    );
  }
}

function toDashboardSummary(
  group: Group,
  aggregate: SpaceDashboardAggregate | undefined,
): SpaceDashboardSummary {
  const totalApplications = aggregate?.totalApplications ?? 0;
  const correctionCount = aggregate?.correctionCount ?? 0;

  return {
    id: group.id,
    name: group.name,
    description: normalizeDescription(group.description),
    currentUserRole: group.currentUserRole ?? null,
    memberCount: aggregate?.memberCount ?? 0,
    formCount: aggregate?.formCount ?? 0,
    publishedFormCount: aggregate?.publishedFormCount ?? 0,
    totalApplications,
    needsActionCount: aggregate?.needsActionCount ?? 0,
    returnedCount: aggregate?.returnedCount ?? 0,
    approvedCount: aggregate?.approvedCount ?? 0,
    rejectedCount: aggregate?.rejectedCount ?? 0,
    correctionCount,
    resubmitCount: aggregate?.resubmitCount ?? 0,
    avgReturns:
      totalApplications > 0
        ? (correctionCount / totalApplications).toFixed(2)
        : '0.00',
    latestApplicationAt: toIsoString(aggregate?.latestApplicationAt ?? null),
  };
}

function normalizeDescription(description: string | null): string | null {
  return description && description.length > 0 ? description : null;
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
