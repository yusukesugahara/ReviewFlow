import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/app/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { TENANT_ROLES } from "@/lib/constants/roles";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import type {
  GroupAvailableUsersSuccessJson,
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import type {
  SpaceUsersApiFailure,
  SpaceUsersAvailableUser,
  SpaceUsersGroup,
  SpaceUsersMember,
  SpaceUsersPageProps,
} from "./types";
import { SpaceUsersErrorView, SpaceUsersView } from "./view";
async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

async function listSpaces(headers: { Authorization: string }): Promise<SpaceUsersGroup[]> {
  const response = await client.GET("/groups", { headers });
  const data: GroupsListSuccessJson | undefined = response.data;
  if (!response.response.ok || !data) {
    throw { status: response.response.status };
  }
  return unwrapData<GroupsListSuccessJson["data"]>(data).groups ?? [];
}

async function listSpaceMembers(
  groupId: string,
  headers: { Authorization: string },
): Promise<SpaceUsersMember[]> {
  const response = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId } },
    headers,
  });
  const data: GroupMembersListSuccessJson | undefined = response.data;
  if (!response.response.ok || !data) {
    throw { status: response.response.status };
  }
  return unwrapData<GroupMembersListSuccessJson["data"]>(data).members.map((member) => ({
    ...member,
    name: typeof member.name === "string" ? member.name : null,
  }));
}

async function listAvailableUsers(
  groupId: string,
  headers: { Authorization: string },
): Promise<SpaceUsersAvailableUser[]> {
  const response = await client.GET("/groups/{groupId}/available-users", {
    params: { path: { groupId } },
    headers,
  });
  const data: GroupAvailableUsersSuccessJson | undefined = response.data;
  if (!response.response.ok || !data) {
    throw { status: response.response.status };
  }
  return unwrapData<GroupAvailableUsersSuccessJson["data"]>(data).users.map((user) => ({
    ...user,
    name: typeof user.name === "string" ? user.name : null,
  }));
}

export default async function SpaceUsersPage({ searchParams }: SpaceUsersPageProps) {
  try {
    const params = (await searchParams) ?? {};
    const authHeaders = await authHeadersOrRedirect();
    const [spaces, me] = await Promise.all([
      listSpaces(authHeaders),
      getCurrentSessionUser(),
    ]);
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }

    const isTenantAdmin = me?.roles.includes(TENANT_ROLES.admin) ?? false;
    const currentSpace = spaces.find((space) => space.id === spaceId);
    const [members, availableUsers] = await Promise.all([
      listSpaceMembers(spaceId, authHeaders),
      isTenantAdmin ? listAvailableUsers(spaceId, authHeaders) : Promise.resolve([]),
    ]);

    return (
      <SpaceUsersView
        availableUsers={availableUsers}
        currentUserId={me?.id ?? null}
        error={params.error}
        formError={params.formError}
        isTenantAdmin={isTenantAdmin}
        members={members}
        spaceId={spaceId}
        spaceName={currentSpace?.name ?? "選択中スペース"}
      />
    );
  } catch (error) {
    return (
      <SpaceUsersErrorView
        status={
          error && typeof error === "object" && typeof (error as SpaceUsersApiFailure).status === "number"
            ? (error as SpaceUsersApiFailure).status
            : undefined
        }
      />
    );
  }
}
