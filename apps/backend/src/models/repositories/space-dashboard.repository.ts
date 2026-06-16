import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';

export type SpaceDashboardAggregate = {
  groupId: string;
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
  latestApplicationAt: Date | string | null;
};

type DashboardAggregateParams = {
  tenantId: string;
  groupIds: string[];
  actorId: string;
  canReadAllApplications: boolean;
  manageableGroupIds: string[];
};

type MemberCountRow = {
  groupId: string;
  memberCount: number | string;
};

type FormCountRow = {
  groupId: string;
  formCount: number | string;
  publishedFormCount: number | string;
};

type ApplicationCountRow = {
  groupId: string;
  totalApplications: number | string;
  needsActionCount: number | string;
  returnedCount: number | string;
  approvedCount: number | string;
  rejectedCount: number | string;
  correctionCount: number | string;
  resubmitCount: number | string;
  latestApplicationAt: Date | string | null;
};

@Injectable()
export class SpaceDashboardRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getDashboardAggregates(
    params: DashboardAggregateParams,
  ): Promise<SpaceDashboardAggregate[]> {
    if (params.groupIds.length === 0) {
      return [];
    }

    const aggregates = new Map(
      params.groupIds.map((groupId) => [groupId, emptyAggregate(groupId)]),
    );
    const [memberRows, formRows, applicationRows] = await Promise.all([
      this.getMemberCounts(params.tenantId, params.groupIds),
      this.getFormCounts(params.tenantId, params.groupIds),
      this.getApplicationCounts(params),
    ]);

    for (const row of memberRows) {
      const aggregate = aggregates.get(row.groupId);
      if (aggregate) {
        aggregate.memberCount = toNumber(row.memberCount);
      }
    }

    for (const row of formRows) {
      const aggregate = aggregates.get(row.groupId);
      if (aggregate) {
        aggregate.formCount = toNumber(row.formCount);
        aggregate.publishedFormCount = toNumber(row.publishedFormCount);
      }
    }

    for (const row of applicationRows) {
      const aggregate = aggregates.get(row.groupId);
      if (aggregate) {
        aggregate.totalApplications = toNumber(row.totalApplications);
        aggregate.needsActionCount = toNumber(row.needsActionCount);
        aggregate.returnedCount = toNumber(row.returnedCount);
        aggregate.approvedCount = toNumber(row.approvedCount);
        aggregate.rejectedCount = toNumber(row.rejectedCount);
        aggregate.correctionCount = toNumber(row.correctionCount);
        aggregate.resubmitCount = toNumber(row.resubmitCount);
        aggregate.latestApplicationAt = row.latestApplicationAt;
      }
    }

    return params.groupIds.map((groupId) => aggregates.get(groupId)!);
  }

  private getMemberCounts(
    tenantId: string,
    groupIds: string[],
  ): Promise<MemberCountRow[]> {
    return this.dataSource.query<MemberCountRow[]>(
      `
        SELECT
          group_id AS "groupId",
          COUNT(*)::int AS "memberCount"
        FROM group_members
        WHERE tenant_id = $1
          AND group_id = ANY($2)
        GROUP BY group_id
      `,
      [tenantId, groupIds],
    );
  }

  private getFormCounts(
    tenantId: string,
    groupIds: string[],
  ): Promise<FormCountRow[]> {
    return this.dataSource.query<FormCountRow[]>(
      `
        SELECT
          group_id AS "groupId",
          COUNT(*)::int AS "formCount",
          COUNT(*) FILTER (WHERE status = $3)::int AS "publishedFormCount"
        FROM form_definitions
        WHERE tenant_id = $1
          AND group_id = ANY($2)
          AND status <> $4
        GROUP BY group_id
      `,
      [
        tenantId,
        groupIds,
        FormDefinitionStatus.PUBLISHED,
        FormDefinitionStatus.ARCHIVED,
      ],
    );
  }

  private getApplicationCounts(
    params: DashboardAggregateParams,
  ): Promise<ApplicationCountRow[]> {
    return this.dataSource.query<ApplicationCountRow[]>(
      `
        WITH visible_applications AS (
          SELECT
            app.id,
            app.group_id,
            app.status,
            app.created_at,
            app.updated_at
          FROM applications app
          LEFT JOIN approval_steps current_step
            ON current_step.tenant_id = app.tenant_id
           AND current_step.group_id = app.group_id
           AND current_step.approval_flow_id = app.approval_flow_id
           AND current_step.step_order = app.current_step_order
          WHERE app.tenant_id = $1
            AND app.group_id = ANY($2)
            AND (
              $4 = true
              OR app.applicant_user_id = $3
              OR (
                app.status = $7
                AND current_step.id IS NOT NULL
                AND (
                  current_step.assignee_user_id = $3
                  OR (
                    current_step.assignee_user_ids IS NOT NULL
                    AND current_step.assignee_user_ids::jsonb ? ($3::text)
                  )
                )
              )
              OR (
                app.status = ANY($5)
                AND app.group_id = ANY($6)
              )
            )
        )
        SELECT
          visible.group_id AS "groupId",
          COUNT(*)::int AS "totalApplications",
          COUNT(*) FILTER (WHERE visible.status = ANY($8))::int AS "needsActionCount",
          COUNT(*) FILTER (WHERE visible.status = ANY($9))::int AS "returnedCount",
          COUNT(*) FILTER (WHERE visible.status = ANY($10))::int AS "approvedCount",
          COUNT(*) FILTER (WHERE visible.status = ANY($11))::int AS "rejectedCount",
          COALESCE(SUM(correction_counts.correction_count), 0)::int AS "correctionCount",
          COUNT(*) FILTER (
            WHERE visible.status = $7
              AND COALESCE(correction_counts.correction_count, 0) > 0
          )::int AS "resubmitCount",
          MAX(COALESCE(visible.updated_at, visible.created_at)) AS "latestApplicationAt"
        FROM visible_applications visible
        LEFT JOIN (
          SELECT
            application_id,
            COUNT(*)::int AS correction_count
          FROM correction_requests
          WHERE tenant_id = $1
          GROUP BY application_id
        ) correction_counts
          ON correction_counts.application_id = visible.id
        GROUP BY visible.group_id
      `,
      [
        params.tenantId,
        params.groupIds,
        params.actorId,
        params.canReadAllApplications,
        [ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED],
        params.manageableGroupIds,
        ApplicationStatus.IN_REVIEW,
        [ApplicationStatus.SUBMITTED, ApplicationStatus.IN_REVIEW],
        [ApplicationStatus.RETURNED],
        [ApplicationStatus.APPROVED],
        [ApplicationStatus.REJECTED],
      ],
    );
  }
}

function emptyAggregate(groupId: string): SpaceDashboardAggregate {
  return {
    groupId,
    memberCount: 0,
    formCount: 0,
    publishedFormCount: 0,
    totalApplications: 0,
    needsActionCount: 0,
    returnedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    correctionCount: 0,
    resubmitCount: 0,
    latestApplicationAt: null,
  };
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}
