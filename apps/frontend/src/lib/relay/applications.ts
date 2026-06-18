import "server-only";

import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
} from "@/components/applications/detail/application-detail.types";
import {
  APPLICATIONS_QUERY,
  APPLICATION_CORRECTIONS_QUERY,
  APPLICATION_CORRECTION_TARGETS_QUERY,
  APPLICATION_DETAIL_QUERY,
} from "./application-operations";
import { executeRelayOperation } from "./client";
import type { ApplicationSummary } from "@/lib/schema";

type AuthHeaders = { Authorization: string };
type ApplicationProgressStep = NonNullable<
  ApplicationDetailViewModel["approvalProgress"]
>[number];
export type RelayApplicationSummary = ApplicationSummary;

type ApplicationsQuery = {
  applicationsConnection: {
    nodes: RelayApplicationSummary[];
  };
};

type ApplicationDetailQuery = {
  application: ApplicationDetailViewModel;
};

type ApplicationCorrectionsQuery = {
  applicationCorrections: ApplicationCorrection[];
};

type ApplicationCorrectionTargetsQuery = {
  applicationCorrectionTargets: {
    openCorrection: {
      items: ApplicationCorrectionTargetItem[];
    } | null;
  };
};

export function getRelayApplications({
  authHeaders,
  groupId,
}: {
  authHeaders: AuthHeaders;
  groupId: string;
}): Promise<RelayApplicationSummary[]> {
  return executeRelayOperation<ApplicationsQuery>({
    headers: authHeaders,
    kind: "query",
    name: "Applications",
    text: APPLICATIONS_QUERY,
    variables: { groupId },
  }).then((data) => data.applicationsConnection.nodes);
}

export function getRelayApplication({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationDetailViewModel> {
  return executeRelayOperation<ApplicationDetailQuery>({
    headers: authHeaders,
    kind: "query",
    name: "ApplicationDetail",
    text: APPLICATION_DETAIL_QUERY,
    variables: { id: applicationId },
  }).then((data) => mapApplicationDetail(data.application));
}

export function getRelayApplicationCorrections({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrection[]> {
  return executeRelayOperation<ApplicationCorrectionsQuery>({
    headers: authHeaders,
    kind: "query",
    name: "ApplicationCorrections",
    text: APPLICATION_CORRECTIONS_QUERY,
    variables: { id: applicationId },
  }).then((data) => data.applicationCorrections);
}

export function getRelayOpenCorrectionItems({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrectionTargetItem[]> {
  return executeRelayOperation<ApplicationCorrectionTargetsQuery>({
    headers: authHeaders,
    kind: "query",
    name: "ApplicationCorrectionTargets",
    text: APPLICATION_CORRECTION_TARGETS_QUERY,
    variables: { id: applicationId },
  }).then(
    (data) => data.applicationCorrectionTargets.openCorrection?.items ?? [],
  );
}

function mapApplicationDetail(
  application: ApplicationDetailViewModel,
): ApplicationDetailViewModel {
  return {
    ...application,
    values: toRecord(application.values),
    approvalProgress: (application.approvalProgress ?? []).map((step) => ({
      ...step,
      status: step.status as ApplicationProgressStep["status"],
    })),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
