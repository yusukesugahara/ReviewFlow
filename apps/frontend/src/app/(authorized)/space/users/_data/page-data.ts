import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { TENANT_ROLES } from "@/lib/constants/roles";
import type {
  GroupAvailableUsersSuccessJson,
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type {
  SpaceUsersAvailableUser,
  SpaceUsersGroup,
  SpaceUsersMember,
} from "../types";

type AuthHeaders = { Authorization: string };

export type SpaceUsersPageData =
  | {
      kind: "empty";
      userRoles: string[];
    }
  | {
      kind: "ready";
      availableUsers: SpaceUsersAvailableUser[];
      currentUserId: string | null;
      isTenantAdmin: boolean;
      members: SpaceUsersMember[];
      spaceId: string;
    };

export async function getSpaceUsersPageData({
  querySpaceId,
}: {
  querySpaceId?: string;
}): Promise<SpaceUsersPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [spaces, me] = await Promise.all([
    listSpaces(authHeaders),
    getCurrentSessionUser(),
  ]);
  const spaceId = querySpaceId ?? spaces[0]?.id ?? "";

  if (!spaceId) {
    return {
      kind: "empty",
      userRoles: me?.roles ?? [],
    };
  }

  const isTenantAdmin = me?.roles.includes(TENANT_ROLES.admin) ?? false;
  const [members, availableUsers] = await Promise.all([
    listSpaceMembers(spaceId, authHeaders),
    isTenantAdmin ? listAvailableUsers(spaceId, authHeaders) : Promise.resolve([]),
  ]);

  return {
    kind: "ready",
    availableUsers,
    currentUserId: me?.id ?? null,
    isTenantAdmin,
    members,
    spaceId,
  };
}

async function listSpaces(headers: AuthHeaders): Promise<SpaceUsersGroup[]> {
  const response = await client.GET("/groups", { headers });
  return unwrapResponseData<GroupsListSuccessJson["data"]>(response).groups ?? [];
}

async function listSpaceMembers(
  groupId: string,
  headers: AuthHeaders,
): Promise<SpaceUsersMember[]> {
  const response = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId } },
    headers,
  });
  return unwrapResponseData<GroupMembersListSuccessJson["data"]>(
    response,
  ).members.map((member) => ({
    ...member,
    name: typeof member.name === "string" ? member.name : null,
  }));
}

async function listAvailableUsers(
  groupId: string,
  headers: AuthHeaders,
): Promise<SpaceUsersAvailableUser[]> {
  const response = await client.GET("/groups/{groupId}/available-users", {
    params: { path: { groupId } },
    headers,
  });
  return unwrapResponseData<GroupAvailableUsersSuccessJson["data"]>(
    response,
  ).users.map((user) => ({
    ...user,
    name: typeof user.name === "string" ? user.name : null,
  }));
}
