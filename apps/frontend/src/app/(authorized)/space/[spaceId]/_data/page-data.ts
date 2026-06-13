import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import { SPACE_ROLES, TENANT_ROLES } from "@/lib/constants/roles";
import type {
  ApplicationsListSuccessJson,
  FormDefinitionsListSuccessJson,
  GroupMemberSummary,
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type { SpaceOverviewPageData, SpaceOverviewSpace } from "../types";

type AuthHeaders = { Authorization: string };

export async function getSpaceOverviewPageData({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<SpaceOverviewPageData> {
  const [spaces, me] = await Promise.all([
    listSpaces(authHeaders),
    getCurrentSessionUser(),
  ]);
  const space = spaces.find((item) => item.id === spaceId);

  if (!space) {
    throw { status: 404 };
  }

  const isTenantAdmin = me?.roles.includes(TENANT_ROLES.admin) ?? false;
  const canManageSpace =
    isTenantAdmin || space.currentUserRole === SPACE_ROLES.admin;
  const [applications, formDefinitions, members] = await Promise.all([
    listApplications(spaceId, authHeaders),
    listFormDefinitions(spaceId, authHeaders),
    canManageSpace ? listMembers(spaceId, authHeaders) : Promise.resolve([]),
  ]);

  return {
    applications,
    canManageSpace,
    currentUserId: me?.id ?? null,
    formDefinitions,
    isTenantAdmin,
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
