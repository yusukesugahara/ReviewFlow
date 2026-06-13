import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import { SPACE_ROLES, TENANT_ROLES } from "@/lib/constants/roles";
import type {
  ApplicationsListSuccessJson,
  AuditLogItem,
  AuditLogsListSuccessJson,
  FormDefinitionsListSuccessJson,
  GroupMemberSummary,
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type { SpaceOverviewPageData, SpaceOverviewSpace } from "../types";

type AuthHeaders = { Authorization: string };

export async function getSpaceOverviewPageData({
  spaceId,
}: {
  spaceId: string;
}): Promise<SpaceOverviewPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [spaces, me] = await Promise.all([
    listSpaces(authHeaders),
    getCurrentSessionUser(),
  ]);
  const space = spaces.find((item) => item.id === spaceId);

  if (!space) {
    throw { status: 404 };
  }

  const canViewAuditLogs = me?.roles.includes(TENANT_ROLES.admin) ?? false;
  const canManageSpace =
    canViewAuditLogs || space.currentUserRole === SPACE_ROLES.admin;
  const [applications, formDefinitions, members, auditLogs] = await Promise.all([
    listApplications(spaceId, authHeaders),
    listFormDefinitions(spaceId, authHeaders),
    canManageSpace ? listMembers(spaceId, authHeaders) : Promise.resolve([]),
    canViewAuditLogs
      ? listSpaceAuditLogs(spaceId, authHeaders)
      : Promise.resolve([]),
  ]);

  return {
    applications,
    auditLogs,
    canManageSpace,
    canViewAuditLogs,
    currentUserId: me?.id ?? null,
    formDefinitions,
    members,
    space,
  };
}

async function listSpaces(headers: AuthHeaders): Promise<SpaceOverviewSpace[]> {
  const response = await client.GET("/groups", { headers });
  return unwrapResponseData<GroupsListSuccessJson["data"]>(response).groups ?? [];
}

async function listApplications(
  spaceId: string,
  headers: AuthHeaders,
): Promise<ApplicationRow[]> {
  const response = await client.GET("/applications", {
    params: { query: { groupId: spaceId } },
    headers,
  });
  return unwrapResponseData<ApplicationsListSuccessJson["data"]>(response)
    .applications as ApplicationRow[];
}

async function listFormDefinitions(
  spaceId: string,
  headers: AuthHeaders,
): Promise<FormDefinitionRow[]> {
  const response = await client.GET("/form-definitions", {
    params: { query: { groupId: spaceId } },
    headers,
  });
  return unwrapResponseData<FormDefinitionsListSuccessJson["data"]>(
    response,
  ).definitions as FormDefinitionRow[];
}

async function listMembers(
  spaceId: string,
  headers: AuthHeaders,
): Promise<GroupMemberSummary[]> {
  const response = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId: spaceId } },
    headers,
  });
  return unwrapResponseData<GroupMembersListSuccessJson["data"]>(
    response,
  ).members;
}

async function listSpaceAuditLogs(
  spaceId: string,
  headers: AuthHeaders,
): Promise<AuditLogItem[]> {
  const response = await client.GET("/audit-logs", {
    params: { query: { limit: 20, q: spaceId } },
    headers,
  });
  return (
    unwrapResponseData<AuditLogsListSuccessJson["data"]>(response).logs ?? []
  ).filter((row) => row.groupId === spaceId);
}
