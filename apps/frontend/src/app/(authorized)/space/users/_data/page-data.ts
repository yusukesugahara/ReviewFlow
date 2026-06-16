import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
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
import { isTenantAdminUser } from "../_rules/space-user-access-rules";
import {
  normalizeAvailableUsers,
  normalizeSpaceMembers,
} from "../_utils/space-user-normalizers";

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

/**
 * 現在のセッション向けに、選択中スペースのユーザー管理データを読み込みます。
 */
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

  const isTenantAdmin = isTenantAdminUser(me);
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

/**
 * 現在のユーザーが利用できるスペース一覧を取得します。
 */
async function listSpaces(headers: AuthHeaders): Promise<SpaceUsersGroup[]> {
  const response = await client.GET("/groups", { headers });
  return unwrapResponseData<GroupsListSuccessJson["data"]>(response).groups ?? [];
}

/**
 * スペースのメンバー一覧を取得して正規化します。
 */
async function listSpaceMembers(
  groupId: string,
  headers: AuthHeaders,
): Promise<SpaceUsersMember[]> {
  const response = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId } },
    headers,
  });
  return normalizeSpaceMembers(
    unwrapResponseData<GroupMembersListSuccessJson["data"]>(response).members,
  );
}

/**
 * スペースへ追加できるテナントユーザー一覧を取得して正規化します。
 */
async function listAvailableUsers(
  groupId: string,
  headers: AuthHeaders,
): Promise<SpaceUsersAvailableUser[]> {
  const response = await client.GET("/groups/{groupId}/available-users", {
    params: { path: { groupId } },
    headers,
  });
  return normalizeAvailableUsers(
    unwrapResponseData<GroupAvailableUsersSuccessJson["data"]>(response).users,
  );
}
